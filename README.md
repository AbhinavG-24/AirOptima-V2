# 🌫️ AirOptima v2 — Delhi AI Smart Pollution Control Dashboard

> **An AI-powered, real-time air quality monitoring and water sprinkler deployment system for Delhi, built for MCD (Municipal Corporation of Delhi) Smart City operations.**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [API Integrations](#api-integrations)
7. [AI & ML Engine](#ai--ml-engine)
8. [Decision Logic](#decision-logic)
9. [Frontend Dashboard](#frontend-dashboard)
10. [Backend API Routes](#backend-api-routes)
11. [Setup & Installation](#setup--installation)
12. [Environment Variables](#environment-variables)
13. [Running the Project](#running-the-project)
14. [Delhi Zones Covered](#delhi-zones-covered)
15. [Data Flow](#data-flow)
16. [Dashboard Tabs & Panels](#dashboard-tabs--panels)
17. [Map Modes](#map-modes)
18. [Admin Controls](#admin-controls)
19. [Impact Metrics](#impact-metrics)
20. [Known Limitations & Fallbacks](#known-limitations--fallbacks)
21. [Future Roadmap](#future-roadmap)

---

## 🏙️ Project Overview

**AirOptima v2** is a full-stack smart city dashboard that uses live air quality data, real-time weather, and traffic conditions to intelligently deploy water-sprinkler trucks across 10 monitoring zones in Delhi. The system is powered by a machine learning classifier that identifies pollution sources (dust, combustion, or mixed) and makes autonomous sprinkler deployment decisions — minimizing water waste while maximizing public health protection.

The project combines:
- **Live APIs** (WAQI, OpenWeatherMap, TomTom) for real-world data
- **Scikit-learn Random Forest** for pollution classification
- **Flask REST backend** for decision-making and data serving
- **Leaflet.js maps** with heatmap and hotspot visualizations
- **Chart.js** for PM2.5/PM10 trends, AQI forecasts, and analytics
- **A fully responsive dark-theme dashboard UI** designed for operations centers

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🌍 Live AQI Monitoring | Real-time AQI, PM2.5, PM10, NO2 from WAQI API for all 10 zones |
| 🌤️ Live Weather | Temperature, humidity, wind speed from OpenWeatherMap |
| 🚗 Live Traffic | Congestion index and traffic level from TomTom |
| 🤖 AI Classification | Random Forest ML model classifies pollution as dust, combustion, or mixed |
| 💧 Smart Sprinkler Dispatch | Auto-deploys up to 5 trucks based on AQI priority and source type |
| 🔥 Combustion Skip Logic | Skips water spraying in combustion-type zones (vehicles/fire) — water is ineffective |
| 🌡️ Heatmap View | Visual AQI intensity heatmap across Delhi on Leaflet map |
| 🎯 Hotspot Detection | Identifies and ranks top pollution hotspots with pulsing map markers |
| 📡 Live News Feed | Simulated real-time pollution intel from CPCB, IMD, MCD, SAFAR etc. |
| 📊 Analytics Tab | Zone comparisons, source distribution pie chart, full decision log |
| ⚙️ Admin Panel | Manual zone overrides, system toggles, AQI threshold slider |
| 📉 AQI Forecasting | 6-hour AQI forecast per zone based on trend analysis |
| 💰 Impact Metrics | Real-time water savings (kL), cost savings (₹), people covered |
| 🔄 Auto-Refresh | Dashboard auto-refreshes every 30 seconds |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                   │
│  index.html  +  styles.css  +  script.js                │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Command  │  │Analytics │  │  Admin   │  ← Tabs       │
│  │   Tab    │  │   Tab    │  │   Tab    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  Leaflet Map  │  Chart.js  │  Real-time panels          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP REST (fetch API)
                       │ GET  /api/dashboard
                       │ POST /api/sprinkler/toggle
                       ▼
┌─────────────────────────────────────────────────────────┐
│                FLASK BACKEND (app.py)                   │
│                                                         │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │  WAQI API   │   │OpenWeather   │   │ TomTom API  │  │
│  │  (Live AQI) │   │  (Weather)   │   │  (Traffic)  │  │
│  └─────────────┘   └──────────────┘   └─────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         AI Decision Engine                       │   │
│  │  1. Fetch data for all 10 zones                  │   │
│  │  2. ML classify pollution type                   │   │
│  │  3. Sort zones by AQI (highest first)            │   │
│  │  4. Assign trucks in priority order (max 5)      │   │
│  │  5. Skip combustion zones                        │   │
│  │  6. Apply wind safety check                      │   │
│  │  7. Return decisions + sprinkler states          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| HTML5 | — | Structure and markup |
| CSS3 | — | Styling, animations, CSS variables |
| JavaScript (ES6+) | — | App logic, API calls, rendering |
| Leaflet.js | 1.9.4 | Interactive map with zone markers |
| Leaflet.heat | 0.2.0 | AQI heatmap layer |
| Chart.js | 4.4.1 | PM charts, AQI forecast, analytics charts |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.8+ | Backend language |
| Flask | Latest | REST API web framework |
| Flask-CORS | Latest | Cross-Origin Resource Sharing |
| Scikit-learn | Latest | Random Forest ML classifier |
| NumPy | Latest | Numerical operations |
| Pandas | Latest | Data manipulation and ML training |
| Requests | Latest | HTTP calls to external APIs |
| python-dotenv | Latest | Environment variable management |

### External APIs
| API | Provider | Data |
|---|---|---|
| WAQI | World Air Quality Index | Real-time AQI, PM2.5, PM10, NO2 |
| OpenWeatherMap | OpenWeather | Temperature, humidity, wind |
| TomTom Traffic | TomTom | Congestion index, traffic speed |

---

## 📁 Project Structure

```
airoptima-v2/
│
├── index.html          # Main dashboard HTML — structure & layout
├── styles.css          # All CSS styles, animations, CSS variables
├── script.js           # All JavaScript — maps, charts, data, UI logic
│
├── app.py              # Flask backend — APIs, ML engine, decision logic
├── .env                # API keys (never commit to version control!)
│
└── README.md           # This file
```

---

## 🔌 API Integrations

### 1. WAQI — World Air Quality Index
- **Endpoint:** `https://api.waqi.info/feed/geo:{lat};{lng}/`
- **Data returned:** AQI value, PM2.5, PM10, NO2
- **Fallback:** If API fails or returns invalid data, generates realistic random values in Delhi's typical pollution range (AQI 140–320)

### 2. OpenWeatherMap
- **Endpoint:** `https://api.openweathermap.org/data/2.5/weather`
- **Data returned:** Temperature (°C), humidity (%), wind speed (m/s), weather description
- **Fallback:** Generates random realistic Delhi weather values

### 3. TomTom Traffic Flow
- **Endpoint:** `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`
- **Data returned:** Current speed, free-flow speed, congestion index (0–1), traffic level (LOW/MODERATE/HIGH)
- **Fallback:** Generates random congestion values

> ⚠️ **Note:** All three APIs have graceful fallbacks. The dashboard will continue to function even if any API is temporarily unavailable — it will display `(fallback)` in the data source field internally.

---

## 🤖 AI & ML Engine

### Pollution Classifier — `HybridClassifier`

The core AI component is a **Random Forest Classifier** trained on synthetically generated pollution data that mirrors real Delhi air quality patterns.

#### Training Data
- **2,000 synthetic samples** generated with realistic PM2.5, PM10, AQI, and NO2 ranges
- Labels assigned by PM10/PM2.5 ratio (the most reliable indicator of pollution source):

| PM10/PM2.5 Ratio | Pollution Type | Explanation |
|---|---|---|
| > 1.85 | **Dust** | High PM10 relative to PM2.5 → construction/road dust |
| < 1.35 | **Combustion** | Low ratio → vehicular/fire emissions dominate |
| 1.35 – 1.85 | **Mixed** | Blend of both sources |

#### Model Details
```python
RandomForestClassifier(
    n_estimators = 120,
    random_state = 42
)
```
- Input features: `[PM2.5, PM10, AQI, NO2]`
- Output: `{label: "dust"|"combustion"|"mixed", confidence: 0.0–1.0}`
- Preprocessing: `StandardScaler` normalization
- Label encoding: `LabelEncoder`

#### Why Random Forest?
- Handles non-linear relationships between PM values
- Naturally provides probability outputs (confidence scores)
- Robust to noisy real-world sensor data
- Fast inference — suitable for real-time 30-second refresh cycles

---

## ⚙️ Decision Logic

The decision engine runs on every `/api/dashboard` call and follows this pipeline:

```
Step 1: Fetch live data for ALL 10 zones simultaneously
         └── AQI + PM2.5 + PM10 + NO2  (WAQI)
         └── Temperature + Wind + Humidity  (OpenWeatherMap)
         └── Congestion + Traffic Level  (TomTom)

Step 2: Run ML classifier → pollution_type + confidence

Step 3: Sort all zones by AQI (descending)
         └── Highest AQI zones get truck priority

Step 4: Loop through sorted zones and assign actions:

   ┌── Manual Override Active?
   │     YES → Force spray_high + assign truck if available
   │
   ├── Pollution Type == "combustion"?
   │     YES → Skip (water spray is ineffective on vehicle/fire emissions)
   │           Increment combustion_skipped counter
   │
   ├── AQI > threshold (default 180) AND wind_speed < 8 m/s?
   │     YES, AQI > 250 → spray_high (1800 L water)
   │     YES, AQI 180–250 → spray_low (900 L water)
   │     Assign truck if trucks_deployed < MAX_TRUCKS (5)
   │
   ├── Wind speed ≥ 8 m/s?
   │     → No spray (wind disperses water ineffectively)
   │
   └── AQI ≤ threshold?
         → No action required

Step 5: Calculate impact metrics:
         └── Water saved = Uniform deployment (20,000 L) − Actual water used
         └── Cost saved = Water saved × ₹8/litre
         └── People covered = Sum of zone populations with active spray

Step 6: Return full JSON response to frontend
```

---

## 🖥️ Frontend Dashboard

### Visual Design
- **Dark theme** with deep navy/midnight blue palette
- **CSS custom properties (variables)** for consistent theming
- **Monospace font** (`JetBrains Mono`) for data readouts
- **Animated elements:** gem logo pulse, live dot blink, spray sweep, ripple markers, ticker scroll
- **Scanline overlay** for CRT/operations-center aesthetic
- **Glass morphism** panels with `backdrop-filter: blur()`

### Color System
| Variable | Color | Usage |
|---|---|---|
| `--cyan` | `#00c8ff` | Primary data, markers, links |
| `--green` | `#00ffb3` | Active/positive states, sprinklers ON |
| `--orange` | `#ff7b2f` | Combustion type, warnings |
| `--red` | `#ff3d5a` | Alerts, hazardous AQI, OFF state |
| `--gold` | `#ffc940` | Costs, forecasts, manual overrides |
| `--purple` | `#b06aff` | News feed, special indicators |
| `--muted` | `rgba(200,232,255,0.42)` | Secondary labels |

---

## 🗺️ Backend API Routes

### `GET /api/dashboard`
Returns the full dashboard payload — all zone data, AI decisions, sprinkler states, and summary metrics.

**Response structure:**
```json
{
  "timestamp": "2026-02-28T14:30:00",
  "zones": [
    {
      "id": 1,
      "name": "Anand Vihar",
      "lat": 28.6469,
      "lng": 77.3162,
      "pop": 120000,
      "aqi": 287.5,
      "pm25": 129.4,
      "pm10": 243.1,
      "no2": 45.2,
      "pm_ratio": 1.88,
      "pollution_type": "dust",
      "confidence": 0.91,
      "weather": { "temp": 22.1, "humidity": 58, "wind_speed": 3.2 },
      "traffic": { "congestion_index": 0.62, "traffic_level": 1 },
      "forecast": { "history": [...], "forecast": [...] },
      "final_action": "spray_high",
      "truck": true,
      "reason": "Hazardous dust AQI 287 with low wind (3.2 m/s) — high-intensity spray"
    }
  ],
  "sprinklers": { "Anand Vihar": { "active": true } },
  "summary": {
    "avg_aqi": 218.3,
    "trucks_deployed": 3,
    "combustion_skipped": 2,
    "water_saved_L": 14600,
    "cost_saved_INR": 116800,
    "people_covered": 545000,
    "total_zones": 10
  }
}
```

### `POST /api/sprinkler/toggle`
Manually toggles a zone's sprinkler override on/off.

**Request body:**
```json
{ "zone": "Anand Vihar" }
```

**Response:**
```json
{ "zone": "Anand Vihar", "active": true, "message": "Activated sprinkler for Anand Vihar" }
```

### `GET /api/status`
Health check — returns server status and API key presence.

```json
{
  "status": "ok",
  "time": "2026-02-28T14:30:00",
  "keys": { "openweather": true, "tomtom": true, "waqi": true }
}
```

### `GET /api/sprinkler/status`
Returns current state of all manual overrides.

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.8 or higher
- pip
- A modern web browser (Chrome, Firefox, Edge)
- API keys for WAQI, OpenWeatherMap, and TomTom (free tiers available)

### Step 1 — Clone / Download the project
```bash
# Place all files in a single folder
mkdir airoptima-v2
cd airoptima-v2
```

### Step 2 — Install Python dependencies
```bash
pip install flask flask-cors scikit-learn numpy pandas requests python-dotenv
```

Or create a `requirements.txt`:
```
flask
flask-cors
scikit-learn
numpy
pandas
requests
python-dotenv
```
Then run:
```bash
pip install -r requirements.txt
```

### Step 3 — Configure API keys
Create a `.env` file in the project root:
```env
OPENWEATHER_KEY="your_openweathermap_key_here"
TOMTOM_KEY="your_tomtom_key_here"
WAQI_KEY="your_waqi_key_here"
```

> See [API Integrations](#api-integrations) for where to obtain each key.

### Step 4 — Run the backend
```bash
python app.py
```
You should see:
```
✅ ML Classifier trained
🚀 AirOptima Real-Time Backend — Starting on http://localhost:5000
   OPENWEATHER_KEY : ✅
   TOMTOM_KEY      : ✅
   WAQI_KEY        : ✅
```

### Step 5 — Open the frontend
Open `index.html` directly in your browser. The dashboard will connect to `http://localhost:5000/api` automatically.

> 💡 For best results, use Chrome or Firefox. No build step or bundler required — it's plain HTML/CSS/JS.

---

## 🔑 Environment Variables

| Variable | Where to Get | Free Tier |
|---|---|---|
| `OPENWEATHER_KEY` | [openweathermap.org/api](https://openweathermap.org/api) | Yes — 60 calls/min |
| `TOMTOM_KEY` | [developer.tomtom.com](https://developer.tomtom.com) | Yes — 2,500 calls/day |
| `WAQI_KEY` | [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/) | Yes — unlimited for non-commercial |

> ⚠️ **Never commit your `.env` file to a public repository.** Add it to `.gitignore`.

---

## 🗺️ Delhi Zones Covered

| ID | Zone | Latitude | Longitude | Population |
|---|---|---|---|---|
| 1 | Anand Vihar | 28.6469 | 77.3162 | 1,20,000 |
| 2 | ITO | 28.6271 | 77.2402 | 80,000 |
| 3 | Rohini | 28.7495 | 77.0935 | 1,75,000 |
| 4 | Punjabi Bagh | 28.6742 | 77.1311 | 1,10,000 |
| 5 | Okhla | 28.5375 | 77.2741 | 1,40,000 |
| 6 | Connaught Place | 28.6315 | 77.2167 | 85,000 |
| 7 | Dwarka | 28.5921 | 77.0460 | 2,00,000 |
| 8 | Shahdara | 28.6738 | 77.2898 | 1,30,000 |
| 9 | RK Puram | 28.5686 | 77.1741 | 95,000 |
| 10 | Narela | 28.8530 | 77.0933 | 65,000 |

**Total population coverage: ~12,00,000 residents**

A **MCD Water Depot** marker is placed at India Gate (28.6139, 77.2090) representing the central truck dispatch point.

---

## 🔄 Data Flow

```
Every 30 seconds (auto-refresh):

Browser → GET /api/dashboard
               ↓
         Flask backend
               ↓
    ┌──────────────────────┐
    │  For each of 10 zones│
    │  (parallel fetch)    │
    │                      │
    │  WAQI  → AQI data    │
    │  OWM   → Weather     │
    │  TomTom→ Traffic     │
    └──────────────────────┘
               ↓
    ML Classifier → pollution type + confidence
               ↓
    Decision Engine → actions + truck assignments
               ↓
    JSON response → Browser
               ↓
    render() → Update all UI panels:
      • Zone cards (left panel)
      • Map markers + ripples + trucks
      • AI Decision card
      • PM2.5/PM10 charts
      • AQI forecast chart
      • Hotspot panel
      • News feed (one new item per refresh)
      • Impact metrics
      • Ticker bar
      • Analytics charts
      • Admin zone grid
```

---

## 📊 Dashboard Tabs & Panels

### Command Tab (Default)
The main operations view, divided into three columns:

**Left Panel — Zone Status**
- KPI grid: Water Saved, People Covered, Cost Saved, Avg AQI
- Zone cards sorted by AQI (highest first), showing:
  - AQI value with color coding
  - Pollution type badge (DUST / COMBUSTION / MIXED)
  - Sprinkler status (ON / OFF)
  - Truck deployment badge
  - Hotspot indicator (top 3 zones)
  - PM2.5, PM10, temperature, wind speed footer

**Center — Leaflet Map**
- Circular zone markers with AQI values, color-coded by severity
- Green ripple animation around active sprinkler zones
- Truck SVG icons near deployed zones
- MCD Depot marker (triangle)
- Truck status bar at top (5 truck chips)
- WHO limit panel (top right)
- Map mode switcher (bottom right)

**Right Panel — Intelligence**
- AI Decision Engine card (reason, zone, type, ratio, action, confidence bar)
- PM2.5 / PM10 chart with 3 view modes (Live / Bar / Ratio)
- AQI History + 6-hour Forecast chart
- Pollution Hotspots ranked panel
- Live Pollution Intel news feed (updates every 7 seconds)
- Real-Time Impact metrics
- Alert Feed (last 10 system alerts)

### Analytics Tab
- 4 large KPI cards (Water, Cost, People, AQI)
- Zone AQI bar chart (all 10 zones)
- Pollution source doughnut chart (Dust / Combustion / Mixed)
- Full AI Decision Log table (all zones with all parameters)

### Admin Tab
- AQI threshold slider (100–400, default 180)
- Force Refresh, Deploy All, Reset Overrides buttons
- System toggle switches (AI routing, combustion skip, alerts, wind check)
- Manual zone override grid (click to toggle each zone ON/OFF)

---

## 🗺️ Map Modes

| Mode | Description |
|---|---|
| **◉ Markers** | Default — circular AQI markers with color coding, ripples, truck icons |
| **🌡 Heatmap** | Density heatmap showing AQI intensity across Delhi using Leaflet.heat |
| **🎯 Hotspots** | Ranked hotspot markers (pulsing rings) for zones with AQI > 220 |

---

## ⚙️ Admin Controls

| Control | Function |
|---|---|
| AQI Threshold Slider | Sets the minimum AQI to trigger sprinkler activation (default: 180) |
| Force Refresh | Immediately fetches fresh data from all APIs |
| Deploy All Eligible | Activates manual override for all dust-type zones not already spraying |
| Reset All Overrides | Turns off all manual overrides and returns to AI control |
| AI Auto-Routing toggle | Enables/disables the AI decision engine |
| Combustion Skip Logic | If OFF, water will deploy even on combustion zones |
| Live Alerts Feed | Shows/hides the alert feed in the right panel |
| Wind Safety Check | If OFF, ignores wind speed constraint |
| Zone toggles | Individual manual ON/OFF for each of the 10 zones |

---

## 📈 Impact Metrics

The system calculates real-time environmental and economic impact:

| Metric | Formula |
|---|---|
| **Water Saved (kL)** | `(10 zones × 2,000 L uniform) − Actual water used` ÷ 1,000 |
| **Cost Saved (₹)** | `Water saved (L) × ₹8 per litre` |
| **People Covered** | Sum of population in zones with active sprinklers |
| **Combustion Skipped** | Count of zones where combustion type prevented wasteful spraying |
| **AI Efficiency** | `(Combustion skipped / Total zones) × 100 × 1.4` |

**Water allocation per action:**
- `spray_high` → 1,800 L per cycle
- `spray_low` → 900 L per cycle
- `no_spray` → 0 L
- Uniform baseline (for comparison) → 2,000 L per zone

---

## ⚠️ Known Limitations & Fallbacks

| Issue | Handling |
|---|---|
| API rate limits | Graceful fallback to randomised-but-realistic data |
| WAQI returns `"-"` for AQI | Defaults to 150.0 AQI |
| No backend running | Frontend shows error toast; loading screen dismisses |
| Backend unreachable | Alert added to feed; API badge turns red |
| Manual overrides are in-memory | Restarting `app.py` clears all manual overrides |
| News feed is simulated | Uses template-based generation, not live news scraping |
| AQI forecast is trend-based | Uses historical buffer + noise, not a trained forecast model |
| CORS | Flask-CORS enabled for all origins (suitable for local dev) |

---

## 🔭 Future Roadmap

- [ ] **Persistent override storage** — Save manual overrides to SQLite or Redis
- [ ] **Real news integration** — Scrape CPCB/SAFAR RSS feeds for actual alerts
- [ ] **LSTM forecast model** — Replace trend-based AQI forecasting with a trained time-series model
- [ ] **User authentication** — Admin login with JWT tokens
- [ ] **Mobile-responsive layout** — Adapt the 3-column grid for tablets and phones
- [ ] **Historical data storage** — Log all zone readings to a database for long-term analytics
- [ ] **SMS/Email alerts** — Notify officers when AQI crosses critical thresholds
- [ ] **Multi-city support** — Extend beyond Delhi to other Indian metros
- [ ] **Drone integration** — Add aerial sprinkler drone dispatch alongside ground trucks
- [ ] **GRAP stage integration** — Auto-adjust threshold based on official GRAP stage

---

## 👨‍💻 Development Notes

- The frontend communicates with the backend at `http://localhost:5000/api` — update `API_BASE` in `script.js` if deploying to a server
- The ML model retrains every time `app.py` starts (takes ~1–2 seconds)
- All chart instances are created once at startup and updated in-place for performance
- The `pm25Hist` and `pm10Hist` objects maintain rolling 20-point history per zone for the realtime chart
- AQI color thresholds follow the US EPA / CPCB standard scale

---

## 📄 License

This project is built for educational and smart city demonstration purposes. API keys shown in `.env` are for development use — replace with your own for production deployment.

---

*Built with ❤️ for cleaner air in Delhi · AirOptima v2 · MCD Smart System*
