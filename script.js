// ═══════════════════════════════════════════════════════════
// CONFIG & STATE
// ═══════════════════════════════════════════════════════════
const API_BASE    = 'http://localhost:5000/api';
const REFRESH_SEC = 30;

let lastData      = null;
let selectedZone  = null;
let pm25Hist      = {};
let pm10Hist      = {};
let pmViewMode    = 'realtime';   // 'realtime' | 'bar' | 'ratio'
let mapMode       = 'normal';     // 'normal' | 'heatmap' | 'hotspot'
let heatLayer     = null;
let hotspotMarkers = [];
let newsItems     = [];
let newsTimer     = null;

// ═══════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════
setInterval(() => {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('en-IN', { hour12: false });
}, 1000);

// ═══════════════════════════════════════════════════════════
// SVG HELPERS
// ═══════════════════════════════════════════════════════════
function truckSVG(color = '#00ffb3', size = 16) {
  return `<svg width="${size}" height="${Math.round(size*0.78)}" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="3" width="12" height="8" rx="1.2" fill="${color}"/>
    <polygon points="12,2 20,5.5 20,11 12,11" fill="${color}" opacity="0.85"/>
    <rect x="1" y="4" width="5" height="4" rx="0.5" fill="rgba(0,20,40,0.7)"/>
    <circle cx="4"  cy="12.5" r="2.3" fill="${color}" opacity="0.9"/>
    <circle cx="4"  cy="12.5" r="1"   fill="rgba(0,20,40,0.8)"/>
    <circle cx="16" cy="12.5" r="2.3" fill="${color}" opacity="0.9"/>
    <circle cx="16" cy="12.5" r="1"   fill="rgba(0,20,40,0.8)"/>
    <line x1="2" y1="3" x2="0" y2="0" stroke="${color}" stroke-width="0.8" opacity="0.6"/>
    <line x1="4" y1="3" x2="3" y2="0" stroke="${color}" stroke-width="0.8" opacity="0.6"/>
    <line x1="6" y1="3" x2="6" y2="0" stroke="${color}" stroke-width="0.8" opacity="0.6"/>
  </svg>`;
}
function truckSVGIdle(size = 16) {
  return `<svg width="${size}" height="${Math.round(size*0.78)}" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="3" width="12" height="8" rx="1.2" fill="rgba(200,232,255,0.32)"/>
    <polygon points="12,2 20,5.5 20,11 12,11" fill="rgba(200,232,255,0.28)" opacity="0.85"/>
    <rect x="1" y="4" width="5" height="4" rx="0.5" fill="rgba(0,20,40,0.5)"/>
    <circle cx="4"  cy="12.5" r="2.3" fill="rgba(200,232,255,0.32)"/>
    <circle cx="16" cy="12.5" r="2.3" fill="rgba(200,232,255,0.32)"/>
  </svg>`;
}
function makeTruckMapIcon(color = '#00ffb3') {
  const html = `<div style="filter:drop-shadow(0 0 5px ${color})">
    <svg width="26" height="20" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="3" width="12" height="8" rx="1.2" fill="${color}"/>
      <polygon points="12,2 20,5.5 20,11 12,11" fill="${color}" opacity="0.85"/>
      <rect x="1" y="4" width="5" height="4" rx="0.5" fill="rgba(0,20,40,0.7)"/>
      <circle cx="4"  cy="12.5" r="2.3" fill="${color}" opacity="0.9"/>
      <circle cx="4"  cy="12.5" r="1"   fill="rgba(0,20,40,0.8)"/>
      <circle cx="16" cy="12.5" r="2.3" fill="${color}" opacity="0.9"/>
      <circle cx="16" cy="12.5" r="1"   fill="rgba(0,20,40,0.8)"/>
      <line x1="2" y1="3" x2="0" y2="0" stroke="${color}" stroke-width="0.9" opacity="0.65"/>
      <line x1="4" y1="3" x2="3" y2="0" stroke="${color}" stroke-width="0.9" opacity="0.65"/>
      <line x1="6" y1="3" x2="6" y2="0" stroke="${color}" stroke-width="0.9" opacity="0.65"/>
    </svg>
  </div>`;
  return L.divIcon({ html, className: '', iconSize: [26, 20], iconAnchor: [13, 20] });
}

// ═══════════════════════════════════════════════════════════
// MAP SETUP
// ═══════════════════════════════════════════════════════════
const map = L.map('map', { center: [28.65, 77.18], zoom: 11, zoomControl: false, attributionControl: false });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);
const zoneMarkers  = {};
const rippleMarkers = {};
const truckMapMarkers = {};

// Depot
L.marker([28.6139, 77.2090], {
  icon: L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 40 40">
      <polygon points="20,4 36,34 4,34" fill="none" stroke="#ffc940" stroke-width="2" opacity=".8"/>
      <text x="20" y="30" text-anchor="middle" fill="#ffc940" font-size="7" font-family="monospace">DEPOT</text>
    </svg>`,
    className: '', iconSize: [38, 38], iconAnchor: [19, 34]
  }), zIndexOffset: 1000
}).bindTooltip('MCD Water Depot', { direction: 'top' }).addTo(map);

function aqiColor(aqi) {
  if (aqi <= 50)  return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  if (aqi <= 300) return '#8f3f97';
  return '#7e0023';
}

function makeZoneIcon(aqi, active, selected) {
  const c = aqiColor(aqi);
  const ring = active ? `<circle cx="22" cy="22" r="20" fill="none" stroke="#00ffb3" stroke-width="2" opacity=".8"/>` : '';
  const sel  = selected ? `<circle cx="22" cy="22" r="21" fill="none" stroke="#00c8ff" stroke-width="1.5" stroke-dasharray="4 2"/>` : '';
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="${c}" fill-opacity=".22" stroke="${c}" stroke-width="2"/>
      ${ring}${sel}
      <text x="22" y="27" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="monospace">${Math.round(Math.min(aqi,999))}</text>
    </svg>`,
    className: '', iconSize: [44, 44], iconAnchor: [22, 22]
  });
}

function makeRippleIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:58px;height:58px;">${[0,.5,1].map(d=>`<div style="position:absolute;top:50%;left:50%;width:48px;height:48px;border-radius:50%;border:2px solid #00ffb3;margin:-24px;animation:rpl 2s ease-out ${d}s infinite;opacity:0;"></div>`).join('')}<style>@keyframes rpl{0%{transform:scale(.3);opacity:.8;}100%{transform:scale(2.3);opacity:0;}}</style></div>`,
    className: '', iconSize: [58, 58], iconAnchor: [29, 29]
  });
}

// ═══════════════════════════════════════════════════════════
// MAP MODE SWITCHER — heatmap & hotspot
// ═══════════════════════════════════════════════════════════
function setMapMode(mode, btn) {
  mapMode = mode;
  document.querySelectorAll('.mmode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('map-legend').style.display    = (mode === 'normal' || mode === 'hotspot') ? 'block' : 'none';
  document.getElementById('heatmap-legend').style.display = mode === 'heatmap' ? 'block' : 'none';

  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }

  hotspotMarkers.forEach(m => map.removeLayer(m));
  hotspotMarkers = [];

  Object.values(zoneMarkers).forEach(m => {
    m._icon && (m._icon.style.opacity = mode === 'heatmap' ? '0.35' : '1');
  });

  if (!lastData) return;
  const zones = lastData.zones || [];

  if (mode === 'heatmap') {
    buildHeatmap(zones);
  } else if (mode === 'hotspot') {
    buildHotspotMarkers(zones);
  }
}

function buildHeatmap(zones) {
  const pts = [];
  zones.forEach(z => {
    const intensity = Math.min(z.aqi / 500, 1.0);
    const spread    = 0.025;
    pts.push([z.lat, z.lng, intensity]);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const dist  = spread * (0.3 + Math.random() * 0.7);
      pts.push([
        z.lat + Math.sin(angle) * dist,
        z.lng + Math.cos(angle) * dist,
        intensity * 0.45
      ]);
    }
  });
  heatLayer = L.heatLayer(pts, {
    radius: 55,
    blur: 40,
    maxZoom: 13,
    gradient: { 0.1: '#00e400', 0.3: '#ffff00', 0.5: '#ff7e00', 0.7: '#ff0000', 0.85: '#8f3f97', 1.0: '#7e0023' }
  }).addTo(map);
}

function buildHotspotMarkers(zones) {
  const hotspots = [...zones]
    .filter(z => z.aqi > 220)
    .sort((a, b) => b.aqi - a.aqi);

  hotspots.forEach((z, i) => {
    const c   = aqiColor(z.aqi);
    const rank = i + 1;
    const icon = L.divIcon({
      html: `<div style="position:relative;">
        <div style="position:absolute;top:50%;left:50%;width:44px;height:44px;border-radius:50%;
             border:2px solid ${c};margin:-22px;animation:hs-pulse 1.8s ease-out ${i*0.3}s infinite;opacity:0;">
        </div>
        <div style="background:${c};color:#000;font-family:monospace;font-size:9px;font-weight:bold;
             width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
             box-shadow:0 0 12px ${c};">
          #${rank}
        </div>
        <style>@keyframes hs-pulse{0%{transform:scale(0.5);opacity:0.9;}100%{transform:scale(2.5);opacity:0;}}</style>
      </div>`,
      className: '', iconSize: [26, 26], iconAnchor: [13, 13]
    });
    const m = L.marker([z.lat, z.lng], { icon, zIndexOffset: 900 })
      .addTo(map)
      .bindTooltip(`🎯 HOTSPOT #${rank}: ${z.name}<br>AQI: ${Math.round(z.aqi)} | ${z.pollution_type.toUpperCase()}<br>PM2.5: ${Math.round(z.pm25)} μg/m³`, { direction: 'top' });
    hotspotMarkers.push(m);
  });
}

// ═══════════════════════════════════════════════════════════
// CHARTS SETUP
// ═══════════════════════════════════════════════════════════
Chart.defaults.color = 'rgba(200,232,255,0.5)';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
const mf = { family: "'JetBrains Mono',monospace", size: 8.5 };

const pmCtx = document.getElementById('pmChart').getContext('2d');
const pmChart = new Chart(pmCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'PM2.5 (μg/m³)',
        data: [],
        borderColor: '#ff6b9d',
        backgroundColor: 'rgba(255,107,157,0.10)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
        pointBackgroundColor: '#ff6b9d'
      },
      {
        label: 'PM10 (μg/m³)',
        data: [],
        borderColor: '#00c8ff',
        backgroundColor: 'rgba(0,200,255,0.07)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
        pointBackgroundColor: '#00c8ff'
      }
    ]
  },
  options: {
    responsive: true,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: { font: mf, boxWidth: 10, padding: 8, color: 'rgba(200,232,255,0.7)' }
      },
      tooltip: {
        backgroundColor: 'rgba(6,18,32,0.95)',
        borderColor: 'rgba(0,200,255,0.25)',
        borderWidth: 1,
        titleFont: mf,
        bodyFont: mf,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.raw !== null ? ctx.raw.toFixed(1) : 'N/A'} μg/m³`
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: { font: mf, maxTicksLimit: 8, color: 'rgba(200,232,255,0.4)' },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        display: true,
        ticks: { font: mf, color: 'rgba(200,232,255,0.4)' },
        grid: { color: 'rgba(255,255,255,0.04)' },
        title: { display: true, text: 'μg/m³', font: mf, color: 'rgba(200,232,255,0.3)' }
      }
    }
  }
});

const fcChart = new Chart(document.getElementById('fcChart'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'History', data: [], borderColor: '#00c8ff', backgroundColor: 'rgba(0,200,255,.07)', tension: .4, pointRadius: 1, borderWidth: 1.5, fill: true },
      { label: 'Forecast', data: [], borderColor: '#ffc940', borderDash: [5,3], backgroundColor: 'rgba(255,201,64,.05)', tension: .4, pointRadius: 1, borderWidth: 1.5 }
    ]
  },
  options: {
    responsive: true, animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { font: mf, boxWidth: 8 } } },
    scales: {
      x: { ticks: { font: mf, color: 'rgba(200,232,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: { ticks: { font: mf, color: 'rgba(200,232,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.04)' } }
    }
  }
});

const aqiBarChart = new Chart(document.getElementById('aqiBarChart'), {
  type: 'bar',
  data: { labels: [], datasets: [{ label: 'AQI', data: [], backgroundColor: [], borderRadius: 3 }] },
  options: {
    responsive: true, animation: { duration: 300 },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: mf } },
      y: { ticks: { font: mf }, grid: { color: 'rgba(255,255,255,.04)' } }
    }
  }
});

const pieChart = new Chart(document.getElementById('pieChart'), {
  type: 'doughnut',
  data: {
    labels: ['Dust', 'Combustion', 'Mixed'],
    datasets: [{ data: [0,0,0], backgroundColor: ['rgba(0,200,255,.7)','rgba(255,123,47,.7)','rgba(255,201,64,.7)'], borderWidth: 0 }]
  },
  options: {
    responsive: true, cutout: '62%',
    plugins: { legend: { labels: { font: mf, boxWidth: 10 } } }
  }
});

// ═══════════════════════════════════════════════════════════
// PM CHART VIEW MODES
// ═══════════════════════════════════════════════════════════
function setPMView(mode, btn) {
  pmViewMode = mode;
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (mode === 'bar') {
    pmChart.config.type = 'bar';
    document.getElementById('pm-chart-title').textContent = 'PM2.5 & PM10 — All Zones';
    if (lastData) renderPMBar(lastData.zones);
  } else if (mode === 'ratio') {
    pmChart.config.type = 'line';
    document.getElementById('pm-chart-title').textContent = 'PM10/PM2.5 Ratio — Trend';
    if (lastData) renderPMRatio(lastData.zones);
  } else {
    pmChart.config.type = 'line';
    document.getElementById('pm-chart-title').textContent = 'PM2.5 & PM10 — Real-time';
    const z = lastData ? lastData.zones.find(x => x.name === selectedZone) || lastData.zones.reduce((a,b)=>a.aqi>b.aqi?a:b,lastData.zones[0]) : null;
    if (z) updatePMChart(z);
  }
  pmChart.update();
}

function updatePMChart(z) {
  if (!z || pmViewMode !== 'realtime') return;

  if (!pm25Hist[z.name]) { pm25Hist[z.name] = []; pm10Hist[z.name] = []; }

  const lastVal = pm25Hist[z.name][pm25Hist[z.name].length - 1];
  if (lastVal !== z.pm25) {
    pm25Hist[z.name].push(parseFloat(z.pm25.toFixed(1)));
    pm10Hist[z.name].push(parseFloat(z.pm10.toFixed(1)));
  }
  if (pm25Hist[z.name].length > 20) { pm25Hist[z.name].shift(); pm10Hist[z.name].shift(); }

  const n = pm25Hist[z.name].length;

  pmChart.config.type = 'line';
  pmChart.data.labels = pm25Hist[z.name].map((_, i) => {
    const minAgo = (n - 1 - i) * 0.5;
    return minAgo === 0 ? 'now' : `-${minAgo.toFixed(1)}m`;
  });
  pmChart.data.datasets[0].data  = [...pm25Hist[z.name]];
  pmChart.data.datasets[1].data  = [...pm10Hist[z.name]];
  pmChart.data.datasets[0].label = 'PM2.5 (μg/m³)';
  pmChart.data.datasets[1].label = 'PM10 (μg/m³)';
  pmChart.data.datasets[0].borderColor = '#ff6b9d';
  pmChart.data.datasets[0].backgroundColor = 'rgba(255,107,157,0.10)';
  pmChart.data.datasets[0].pointRadius = 2;
  pmChart.data.datasets[1].borderColor = '#00c8ff';
  pmChart.data.datasets[1].backgroundColor = 'rgba(0,200,255,0.07)';
  pmChart.data.datasets[1].pointRadius = 2;
  pmChart.update('none');
}

function renderPMBar(zones) {
  if (!zones || pmViewMode !== 'bar') return;
  const labels = zones.map(z => z.name.split(' ')[0]);
  pmChart.data.labels = labels;
  pmChart.data.datasets[0] = {
    label: 'PM2.5',
    data: zones.map(z => parseFloat(z.pm25.toFixed(1))),
    backgroundColor: 'rgba(255,107,157,0.6)',
    borderColor: '#ff6b9d',
    borderWidth: 1,
    borderRadius: 3
  };
  pmChart.data.datasets[1] = {
    label: 'PM10',
    data: zones.map(z => parseFloat(z.pm10.toFixed(1))),
    backgroundColor: 'rgba(0,200,255,0.5)',
    borderColor: '#00c8ff',
    borderWidth: 1,
    borderRadius: 3
  };
  pmChart.update('none');
}

function renderPMRatio(zones) {
  if (!zones || pmViewMode !== 'ratio') return;
  const sorted = [...zones].sort((a,b) => b.aqi - a.aqi);
  pmChart.data.labels = sorted.map(z => z.name.split(' ')[0]);
  pmChart.data.datasets[0] = {
    label: 'PM10/PM2.5 Ratio',
    data: sorted.map(z => parseFloat(z.pm_ratio)),
    borderColor: '#ffc940',
    backgroundColor: 'rgba(255,201,64,0.08)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointBackgroundColor: sorted.map(z => z.pm_ratio > 1.85 ? '#00ffb3' : z.pm_ratio < 1.35 ? '#ff7b2f' : '#ffc940'),
    borderWidth: 2
  };
  pmChart.data.datasets[1] = { data: [], label: '', borderWidth: 0, pointRadius: 0 };
  pmChart.update('none');
}

function updateFcChart(z) {
  if (!z?.forecast) return;
  const hist   = z.forecast.history  || [];
  const fore   = z.forecast.forecast || [];
  const labels = [
    ...hist.map((_, i) => `-${hist.length - i}h`),
    ...fore.map((_, i) => `+${i + 1}h`)
  ];
  fcChart.data.labels           = labels;
  fcChart.data.datasets[0].data = [...hist, ...Array(fore.length).fill(null)];
  fcChart.data.datasets[1].data = [...Array(hist.length - 1).fill(null), hist[hist.length-1] || null, ...fore];
  fcChart.update('none');
}

function updateAnalyticsCharts(zones) {
  aqiBarChart.data.labels                      = zones.map(z => z.name.split(' ')[0]);
  aqiBarChart.data.datasets[0].data            = zones.map(z => Math.round(z.aqi));
  aqiBarChart.data.datasets[0].backgroundColor = zones.map(z => aqiColor(z.aqi) + 'bb');
  aqiBarChart.update('none');
  const dc = zones.filter(z => z.pollution_type === 'dust').length;
  const cc = zones.filter(z => z.pollution_type === 'combustion').length;
  pieChart.data.datasets[0].data = [dc, cc, zones.length - dc - cc];
  pieChart.update('none');
}

// ═══════════════════════════════════════════════════════════
// NEWS FEED — simulated real-time pollution news
// ═══════════════════════════════════════════════════════════
const NEWS_TEMPLATES = [
  { tpl: (z) => `Delhi's ${z.name} records AQI of ${Math.round(z.aqi)} — residents advised to limit outdoor activities`, tag: 'alert', src: 'CPCB' },
  { tpl: (z) => `MCD deploys water sprinklers across ${z.name} as PM2.5 crosses ${Math.round(z.pm25)} μg/m³`, tag: 'action', src: 'MCD' },
  { tpl: (z) => `Construction dust identified as primary pollutant in ${z.name} area`, tag: 'info', src: 'IMD' },
  { tpl: (z) => `Air quality deteriorates in ${z.name} — PM10 at ${Math.round(z.pm10)} μg/m³ (${Math.round(z.pm10/50)}× safe limit)`, tag: 'warning', src: 'SAFAR' },
  { tpl: (z) => `Wind speed at ${z.weather?.wind_speed || 3.2} m/s in ${z.name} — low dispersion conditions expected tonight`, tag: 'warning', src: 'IMD' },
  { tpl: (z) => `Vehicular emissions contributing to combustion pollution in ${z.name} corridor`, tag: 'info', src: 'EPCA' },
  { tpl: (z) => `GRAP Stage ${z.aqi > 300 ? 'IV' : z.aqi > 250 ? 'III' : 'II'} restrictions activated near ${z.name}`, tag: 'alert', src: 'CAQM' },
  { tpl: () => `Delhi overall AQI forecast: moderate improvement expected after 6 AM due to northwesterly winds`, tag: 'info', src: 'SAFAR' },
  { tpl: () => `Crop residue burning detected in neighbouring states — transboundary pollution advection underway`, tag: 'warning', src: 'ISRO' },
  { tpl: (z) => `AirOptima AI deployed truck MCD-${Math.ceil(Math.random()*5).toString().padStart(2,'0')} to ${z.name} — estimated 18% AQI reduction in 4 hours`, tag: 'action', src: 'AirOptima' },
  { tpl: () => `Real-time sensor network: 8/10 monitoring stations in Delhi report "Very Poor" air quality`, tag: 'alert', src: 'CPCB' },
  { tpl: (z) => `Hotspot analysis: ${z.name} has highest PM2.5/PM10 concentration in last 3 hours`, tag: 'alert', src: 'AirOptima' },
];

let newsRotateIdx = 0;
function generateNewsItem(zones) {
  if (!zones || zones.length === 0) return null;
  const tplObj = NEWS_TEMPLATES[newsRotateIdx % NEWS_TEMPLATES.length];
  newsRotateIdx++;
  const z    = zones[Math.floor(Math.random() * Math.min(4, zones.length))];
  const text = tplObj.tpl(z);
  const mins = Math.floor(Math.random() * 4);
  return {
    headline: text,
    tag:      tplObj.tag,
    source:   tplObj.src,
    time:     mins === 0 ? 'just now' : `${mins}m ago`
  };
}

function pushNewsItem(item) {
  if (!item) return;
  newsItems.unshift(item);
  if (newsItems.length > 5) newsItems.pop();
  renderNewsFeed();
}

function renderNewsFeed() {
  const el = document.getElementById('news-feed');
  el.innerHTML = newsItems.map(n => `
    <div class="news-item">
      <div class="news-headline">${n.headline}</div>
      <div class="news-meta">
        <span class="news-source">${n.source}</span>
        <span class="news-time">${n.time}</span>
        <span class="news-tag tag-${n.tag}">${n.tag.toUpperCase()}</span>
      </div>
    </div>`).join('');
}

function startNewsSimulator(zones) {
  if (newsTimer) clearInterval(newsTimer);
  for (let i = 0; i < 3; i++) {
    const item = generateNewsItem(zones);
    if (item) { item.time = `${(i+1)*2}m ago`; newsItems.push(item); }
  }
  renderNewsFeed();
  newsTimer = setInterval(() => {
    const item = generateNewsItem(lastData?.zones || zones);
    if (item) pushNewsItem(item);
  }, 7000);
}

// ═══════════════════════════════════════════════════════════
// HOTSPOT PANEL (right side)
// ═══════════════════════════════════════════════════════════
function renderHotspotPanel(zones) {
  const sorted = [...zones].sort((a,b) => b.aqi - a.aqi).slice(0, 4);
  const maxAqi = sorted[0]?.aqi || 1;
  document.getElementById('hotspot-list').innerHTML = sorted.map((z, i) => {
    const c    = aqiColor(z.aqi);
    const pct  = Math.round((z.aqi / Math.max(maxAqi, 1)) * 100);
    const prevAqi = (pm25Hist[z.name] || []).slice(-3);
    const trend = prevAqi.length >= 2
      ? (prevAqi[prevAqi.length-1] - prevAqi[0] > 5 ? '▲' : prevAqi[0] - prevAqi[prevAqi.length-1] > 5 ? '▼' : '→')
      : '→';
    const trendColor = trend === '▲' ? 'var(--red)' : trend === '▼' ? 'var(--green)' : 'var(--muted)';
    return `<div class="hs-item">
      <span style="font-family:var(--mono);font-size:8px;color:${c};width:14px;">#${i+1}</span>
      <span class="hs-name">${z.name}</span>
      <div class="hs-bar-wrap"><div class="hs-bar" style="width:${pct}%;background:${c}"></div></div>
      <span class="hs-aqi" style="color:${c}">${Math.round(z.aqi)}</span>
      <span class="hs-trend" style="color:${trendColor};margin-left:5px;">${trend}</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// DATA FETCH
// ═══════════════════════════════════════════════════════════
async function fetchData() {
  try {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    lastData = data;
    setBadge(true);
    hideErrToast();
    document.getElementById('loading').style.display = 'none';
    render(data);
  } catch (e) {
    setBadge(false);
    showErrToast(`Backend error: ${e.message}`);
    document.getElementById('loading').style.display = 'none';
    addAlert(`⚠ Backend unreachable: ${e.message}`, 'warn');
  }
}

function setBadge(ok) {
  const el = document.getElementById('api-badge');
  el.textContent   = ok ? 'API ●' : 'API ✕';
  el.style.color   = ok ? 'var(--green)' : 'var(--red)';
  el.style.borderColor = ok ? 'rgba(0,255,179,.3)' : 'rgba(255,61,90,.3)';
}
function showErrToast(msg) {
  const el = document.getElementById('err-toast');
  el.textContent   = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 6000);
}
function hideErrToast() { document.getElementById('err-toast').style.display = 'none'; }

// ═══════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════
function render(data) {
  const zones   = data.zones   || [];
  const summary = data.summary || {};
  const spkls   = data.sprinklers || {};

  const wkl = (summary.water_saved_L || 0) / 1000;
  document.getElementById('kw').textContent = wkl.toFixed(1);
  document.getElementById('kp').textContent = fmtNum(summary.people_covered || 0);
  document.getElementById('kc').textContent = '₹' + fmtNum(summary.cost_saved_INR || 0);
  document.getElementById('ka').textContent = Math.round(summary.avg_aqi || 0);

  const avgAQI = summary.avg_aqi || 0;
  document.getElementById('who-x').textContent     = Math.round(avgAQI * 0.45 / 15) + 'x';
  document.getElementById('who-avg').textContent   = Math.round(avgAQI);
  document.getElementById('who-trucks').textContent = `${summary.trucks_deployed || 0}/5`;

  renderZoneList(zones, spkls);
  renderMap(zones, spkls);

  const crit  = zones.reduce((a,b) => a.aqi > b.aqi ? a : b, zones[0] || {});
  const focus = selectedZone ? (zones.find(z => z.name === selectedZone) || crit) : crit;
  if (focus) renderAICard(focus);

  if (pmViewMode === 'realtime' && focus) {
    updatePMChart(focus);
  } else if (pmViewMode === 'bar') {
    renderPMBar(zones);
  } else if (pmViewMode === 'ratio') {
    renderPMRatio(zones);
  }

  updateFcChart(focus);
  updateAnalyticsCharts(zones);
  renderTruckBar(summary, zones);
  renderHotspotPanel(zones);

  if (mapMode === 'heatmap' && heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
    buildHeatmap(zones);
  }
  if (mapMode === 'hotspot') {
    hotspotMarkers.forEach(m => map.removeLayer(m));
    hotspotMarkers = [];
    buildHotspotMarkers(zones);
  }

  const skip   = summary.combustion_skipped || 0;
  const effPct = Math.round((skip / Math.max(zones.length,1)) * 100 * 1.4);
  document.getElementById('imp-t').textContent = `${summary.trucks_deployed || 0}/5`;
  document.getElementById('imp-s').textContent = `${skip} zones`;
  document.getElementById('imp-e').textContent = effPct;
  document.getElementById('imp-w').textContent = `${wkl.toFixed(1)} kL`;

  document.getElementById('an-w').textContent = wkl.toFixed(1);
  document.getElementById('an-c').textContent = '₹' + fmtNum(summary.cost_saved_INR || 0);
  document.getElementById('an-p').textContent = fmtNum(summary.people_covered || 0);
  document.getElementById('an-a').textContent = Math.round(avgAQI);
  renderLogTable(zones);
  renderAdminZones(zones, spkls);

  const items = zones.slice(0,8).map(z => {
    const s = spkls[z.name]?.active ? ' SPRAY' : '';
    return `${z.name}: AQI ${Math.round(z.aqi)} [${z.pollution_type.toUpperCase()}]${s}`;
  }).join('  ◈  ');
  document.getElementById('tick-text').innerHTML =
    `<span class="tick-sep">◈ LIVE FEED</span>${items}<span class="tick-sep">◈</span>${items}`;

  const newsItem = generateNewsItem(zones);
  if (newsItem) pushNewsItem(newsItem);
}

// ─────────────────────────────────────────────────────────
function renderZoneList(zones, spkls) {
  const el = document.getElementById('zone-list');
  el.innerHTML = '';
  const hotspotNames = new Set([...zones].sort((a,b)=>b.aqi-a.aqi).slice(0,3).map(z=>z.name));

  [...zones].sort((a,b) => b.aqi - a.aqi).forEach(z => {
    const col    = aqiColor(z.aqi);
    const pct    = Math.min(100, (z.aqi / 500) * 100);
    const active = spkls[z.name]?.active || false;
    const isSel  = selectedZone === z.name;
    const isManual  = z.reason?.includes('Manual');
    const isHotspot = hotspotNames.has(z.name);
    const div    = document.createElement('div');
    div.className = ['zone-card', active ? 'spray-on' : '', z.pollution_type === 'combustion' ? 'combustion' : '', isSel ? 'sel' : ''].filter(Boolean).join(' ');

    const truckBadge = z.truck
      ? `<span class="badge bd-truck">${truckSVG('#00c8ff',11)} TRUCK</span>` : '';
    const hotspotBadge = isHotspot
      ? `<span class="badge bd-hotspot">🎯 HOTSPOT</span>` : '';

    div.innerHTML = `
      <div class="zc-top">
        <span class="zc-name">${z.name}</span>
        <span class="zc-aqi" style="color:${col}">${Math.round(z.aqi)}</span>
      </div>
      <div class="zc-badges">
        <span class="badge ${typeBadge(z.pollution_type)}">${typeLabel(z.pollution_type)}</span>
        <span class="badge ${active ? 'bd-on' : 'bd-off'}">${active ? '💧 ON' : 'OFF'}</span>
        ${truckBadge}${hotspotBadge}
        ${isManual ? '<span class="badge bd-manual">⚡ MANUAL</span>' : ''}
      </div>
      <div class="zc-bar-bg"><div class="zc-bar" style="width:${pct}%;background:${col}"></div></div>
      <div class="zc-foot">
        <span>PM2.5 <b>${Math.round(z.pm25)}</b></span>
        <span>PM10 <b>${Math.round(z.pm10)}</b></span>
        <span>${z.weather?.temp ?? '—'}°C</span>
        <span>${z.weather?.wind_speed ?? '—'} m/s</span>
      </div>`;

    div.onclick = () => {
      selectedZone = z.name;
      renderZoneList(lastData.zones, lastData.sprinklers || {});
      renderAICard(z);
      updatePMChart(z);
      updateFcChart(z);
      Object.keys(zoneMarkers).forEach(id => {
        const mz = lastData.zones.find(x => x.id == id);
        if (mz) zoneMarkers[id].setIcon(makeZoneIcon(mz.aqi, (lastData.sprinklers||{})[mz.name]?.active||false, mz.name === z.name));
      });
    };
    el.appendChild(div);
  });
}

function renderMap(zones, spkls) {
  Object.keys(truckMapMarkers).forEach(id => { map.removeLayer(truckMapMarkers[id]); delete truckMapMarkers[id]; });

  zones.forEach(z => {
    const active = spkls[z.name]?.active || false;
    const isSel  = selectedZone === z.name;

    if (!zoneMarkers[z.id]) {
      const m = L.marker([z.lat, z.lng], { icon: makeZoneIcon(z.aqi, active, isSel) }).addTo(map);
      m.on('click', () => {
        selectedZone = z.name;
        renderAICard(z);
        updatePMChart(z);
        updateFcChart(z);
        renderZoneList(lastData.zones, lastData.sprinklers || {});
      });
      zoneMarkers[z.id] = m;
    } else {
      zoneMarkers[z.id].setIcon(makeZoneIcon(z.aqi, active, isSel));
    }

    const tLvl = ['LOW','MODERATE','HIGH'][z.traffic?.traffic_level||0];
    zoneMarkers[z.id].bindTooltip(
      `<b>${z.name}</b><br>AQI: <b style="color:${aqiColor(z.aqi)}">${Math.round(z.aqi)}</b> | ${z.pollution_type}<br>PM2.5: ${Math.round(z.pm25)} | PM10: ${Math.round(z.pm10)}<br>Temp: ${z.weather?.temp}°C | Wind: ${z.weather?.wind_speed} m/s<br>Traffic: ${tLvl} | ${active ? '✅ SPRAY' : '❌ OFF'}`,
      { direction:'top' }
    );

    if (active) {
      if (!rippleMarkers[z.id]) {
        rippleMarkers[z.id] = L.marker([z.lat, z.lng], { icon: makeRippleIcon(), zIndexOffset: 500 }).addTo(map);
      }
    } else {
      if (rippleMarkers[z.id]) { map.removeLayer(rippleMarkers[z.id]); delete rippleMarkers[z.id]; }
    }

    if (z.truck) {
      const tm = L.marker([z.lat + 0.011, z.lng + 0.009], { icon: makeTruckMapIcon('#00ffb3'), zIndexOffset: 800 }).addTo(map);
      tm.bindTooltip(`MCD Truck → ${z.name}<br>AQI: ${Math.round(z.aqi)}`, { direction: 'top' });
      truckMapMarkers[z.id] = tm;
    }
  });
}

function renderAICard(z) {
  const typeColor = z.pollution_type==='dust' ? 'var(--cyan)' : z.pollution_type==='combustion' ? 'var(--orange)' : 'var(--gold)';
  const conf      = Math.round((z.confidence || 0) * 100);
  document.getElementById('ai-text').textContent   = z.reason || 'No reason available';
  document.getElementById('ai-zone').textContent   = z.name || '—';
  document.getElementById('ai-type').textContent   = (z.pollution_type || '—').toUpperCase();
  document.getElementById('ai-type').style.color   = typeColor;
  document.getElementById('ai-ratio').textContent  = z.pm_ratio ? `${z.pm_ratio} (PM10/PM2.5)` : '—';
  document.getElementById('ai-action').textContent = (z.final_action||'—').replace(/_/g,' ').toUpperCase();
  document.getElementById('ai-conf').textContent   = `${conf}%`;
  document.getElementById('conf-fill').style.width = `${conf}%`;
}

function renderTruckBar(summary, zones) {
  const deployed = (zones||[]).filter(z => z.truck).sort((a,b)=>b.aqi-a.aqi);
  const n = summary.trucks_deployed || 0;
  document.getElementById('truck-bar').innerHTML = Array.from({length:5},(_,i) => {
    const active = i < n;
    const zone   = deployed[i];
    const label  = zone ? zone.name.split(' ')[0] : (active ? 'DEPLOYED' : 'IDLE');
    return `<div class="truck-chip ${active?'tc-active':'tc-idle'}" title="${zone?`→ ${zone.name} AQI ${Math.round(zone.aqi)}`:'Idle'}">
      ${active ? truckSVG('#00ffb3',14) : truckSVGIdle(14)}
      MCD-0${i+1}: ${label}
    </div>`;
  }).join('');
}

function renderLogTable(zones) {
  document.getElementById('log-body').innerHTML = zones.map(z => {
    const tC = z.pollution_type==='dust' ? 'var(--cyan)' : z.pollution_type==='combustion' ? 'var(--orange)' : 'var(--gold)';
    const aC = z.final_action?.includes('high') ? 'var(--green)' : z.final_action?.includes('low') ? 'var(--cyan)' : 'var(--muted)';
    return `<tr>
      <td>${z.name}</td>
      <td style="color:${aqiColor(z.aqi)}">${Math.round(z.aqi)}</td>
      <td>${Math.round(z.pm25)}</td>
      <td>${Math.round(z.pm10)}</td>
      <td>${z.pm_ratio}</td>
      <td style="color:${tC}">${z.pollution_type}</td>
      <td>${Math.round((z.confidence||0)*100)}%</td>
      <td style="color:${aC}">${(z.final_action||'—').replace(/_/g,' ')}</td>
      <td>${z.truck ? truckSVG('#00ffb3',12) : '—'}</td>
      <td>${z.weather?.wind_speed??'—'} m/s</td>
      <td style="color:var(--muted);font-size:7.5px;">${(z.reason||'').slice(0,55)}</td>
    </tr>`;
  }).join('');
}

function renderAdminZones(zones, spkls) {
  document.getElementById('adm-zones').innerHTML = zones.map(z => {
    const on = spkls[z.name]?.active || false;
    return `<div class="adm-zone">
      <div class="adm-zone-name">${z.name.split(' ')[0]}</div>
      <div class="adm-zone-aqi" style="color:${aqiColor(z.aqi)}">AQI ${Math.round(z.aqi)}</div>
      <div class="adm-zone-tgl ${on?'on':''}" onclick="toggleZone('${z.name}')"><div class="adm-zone-tgl-t"></div></div>
      <div style="font-family:var(--mono);font-size:7.5px;color:var(--muted);margin-top:3px;">${on?'✅ Manual ON':'Auto'}</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function typeBadge(t) { return t==='dust'?'bd-dust':t==='combustion'?'bd-comb':'bd-mixed'; }
function typeLabel(t) { return t==='dust'?'🌫 DUST':t==='combustion'?'🔥 COMB':'⚡ MIXED'; }
function fmtNum(n) {
  if (n>=1e6) return (n/1e6).toFixed(1)+'M';
  if (n>=1e3) return Math.round(n/1000)+'K';
  return n.toString();
}
function addAlert(msg, type='info') {
  if (!document.getElementById('tgl-alerts').classList.contains('on')) return;
  const el  = document.getElementById('alert-feed');
  const cls = type==='dust'?'al-dust':type==='comb'?'al-comb':type==='warn'?'al-warn':'al-info';
  const now = new Date().toLocaleTimeString('en-IN');
  const div = document.createElement('div');
  div.className = `alert-item ${cls}`;
  div.innerHTML = `<div>${msg}</div><div class="al-time">${now}</div>`;
  el.prepend(div);
  while (el.children.length > 10) el.removeChild(el.lastChild);
}

// ═══════════════════════════════════════════════════════════
// TAB SWITCHER
// ═══════════════════════════════════════════════════════════
function switchTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('body').style.display       = tab==='command'   ? 'grid' : 'none';
  document.getElementById('analytics').style.display  = tab==='analytics' ? 'grid' : 'none';
  document.getElementById('admin').style.display      = tab==='admin'     ? 'grid' : 'none';
  if (tab==='analytics') setTimeout(()=>{ aqiBarChart.resize(); pieChart.resize(); }, 60);
}

// ═══════════════════════════════════════════════════════════
// ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════
function adminRefresh() { addAlert('↺ Manual refresh triggered','info'); fetchData(); }

function adminDeployAll() {
  if (!lastData?.zones) return;
  const sorted = [...lastData.zones].sort((a,b) => b.aqi - a.aqi);
  const eligible = sorted.filter(z => !lastData.sprinklers?.[z.name]?.active && z.pollution_type !== 'combustion');
  if (eligible.length === 0) { addAlert('All eligible zones already active','info'); return; }
  addAlert(`Deploying to ${eligible.length} eligible zones by AQI priority…`,'info');
  Promise.all(eligible.map(z => toggleZone(z.name, false))).then(() => {
    addAlert(`Deployed: ${eligible.map(z=>z.name).join(', ')}`,'dust');
    fetchData();
  });
}

function adminResetOverrides() {
  if (!lastData?.zones) return;
  const on = lastData.zones.filter(z => lastData.sprinklers?.[z.name]?.active);
  addAlert(`✕ Resetting ${on.length} override(s)`,'warn');
  Promise.all(on.map(z => toggleZone(z.name, false))).then(() => fetchData());
}

async function toggleZone(name, refetch=true) {
  try {
    const res = await fetch(`${API_BASE}/sprinkler/toggle`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ zone: name })
    });
    const d = await res.json();
    addAlert(`${d.active?'✅ Manual ON':'❌ Manual OFF'}: ${name}`, d.active?'dust':'info');
    if (refetch) fetchData();
    return d;
  } catch(e) {
    addAlert(`⚠ Toggle failed for ${name}: ${e.message}`,'warn');
  }
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
(async function init() {
  document.getElementById('analytics').style.display = 'none';
  document.getElementById('admin').style.display     = 'none';
  await fetchData();
  if (lastData?.zones) startNewsSimulator(lastData.zones);
  setInterval(async () => {
    await fetchData();
    addAlert('🔄 Data auto-refreshed','info');
  }, REFRESH_SEC * 1000);
})();
