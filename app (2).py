from dotenv import load_dotenv
import os

load_dotenv()  # loads keys from .env automatically

import math, time, random, warnings
import numpy as np
import pandas as pd
from datetime import datetime
from collections import deque

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────
# ENVIRONMENT VARIABLES
# ─────────────────────────────────────────
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY")
TOMTOM_KEY      = os.getenv("TOMTOM_KEY")
WAQI_KEY        = os.getenv("WAQI_KEY")

if not all([OPENWEATHER_KEY, TOMTOM_KEY, WAQI_KEY]):
    raise Exception("❌ Missing API keys in .env file")

# ─────────────────────────────────────────
# DELHI ZONES
# ─────────────────────────────────────────
DELHI_ZONES = [
    {"id":1,  "name":"Anand Vihar",    "lat":28.6469, "lng":77.3162, "pop":120000},
    {"id":2,  "name":"ITO",            "lat":28.6271, "lng":77.2402, "pop":80000},
    {"id":3,  "name":"Rohini",         "lat":28.7495, "lng":77.0935, "pop":175000},
    {"id":4,  "name":"Punjabi Bagh",   "lat":28.6742, "lng":77.1311, "pop":110000},
    {"id":5,  "name":"Okhla",          "lat":28.5375, "lng":77.2741, "pop":140000},
    {"id":6,  "name":"Connaught Place","lat":28.6315, "lng":77.2167, "pop":85000},
    {"id":7,  "name":"Dwarka",         "lat":28.5921, "lng":77.0460, "pop":200000},
    {"id":8,  "name":"Shahdara",       "lat":28.6738, "lng":77.2898, "pop":130000},
    {"id":9,  "name":"RK Puram",       "lat":28.5686, "lng":77.1741, "pop":95000},
    {"id":10, "name":"Narela",         "lat":28.8530, "lng":77.0933, "pop":65000},
]

# ─────────────────────────────────────────
# SPRINKLER MANUAL OVERRIDES (in-memory)
# ─────────────────────────────────────────
sprinkler_overrides = {}   # zone_name -> True/False

# ─────────────────────────────────────────
# AQI HISTORY BUFFERS (in-memory)
# ─────────────────────────────────────────
aqi_history = {z["name"]: deque(maxlen=6) for z in DELHI_ZONES}

# ─────────────────────────────────────────
# LIVE AQI (WAQI)
# ─────────────────────────────────────────
def fetch_live_aqi(zone):
    try:
        url = f"https://api.waqi.info/feed/geo:{zone['lat']};{zone['lng']}/"
        r = requests.get(url, params={"token": WAQI_KEY}, timeout=6)
        r.raise_for_status()
        d = r.json().get("data", {})
        if not d or "aqi" not in d:
            raise ValueError("Invalid AQI data")
        iaqi = d.get("iaqi", {})
        aqi_val = float(d["aqi"]) if str(d["aqi"]).lstrip('-').isdigit() else 150.0
        pm25 = float(iaqi.get("pm25", {}).get("v", aqi_val * 0.45))
        pm10 = float(iaqi.get("pm10", {}).get("v", pm25 * 1.6))
        no2  = float(iaqi.get("no2",  {}).get("v", 30.0))
        return {
            "aqi":    round(aqi_val, 1),
            "pm25":   round(pm25, 1),
            "pm10":   round(pm10, 1),
            "no2":    round(no2, 1),
            "source": "live"
        }
    except Exception as e:
        base_aqi = random.uniform(140, 320)
        pm25     = base_aqi * random.uniform(0.40, 0.50)
        pm10     = pm25 * random.uniform(1.3, 2.1)
        return {
            "aqi":    round(base_aqi, 1),
            "pm25":   round(pm25, 1),
            "pm10":   round(pm10, 1),
            "no2":    round(random.uniform(20, 70), 1),
            "source": f"fallback ({str(e)[:40]})"
        }

# ─────────────────────────────────────────
# LIVE WEATHER (OpenWeatherMap)
# ─────────────────────────────────────────
def fetch_weather(lat, lng):
    try:
        r = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"lat": lat, "lon": lng,
                    "appid": OPENWEATHER_KEY, "units": "metric"},
            timeout=6
        )
        r.raise_for_status()
        d = r.json()
        return {
            "temp":        round(d["main"]["temp"], 1),
            "humidity":    d["main"]["humidity"],
            "wind_speed":  round(d["wind"]["speed"], 1),
            "description": d["weather"][0]["description"],
            "source":      "live"
        }
    except Exception as e:
        return {
            "temp":        round(random.uniform(18, 35), 1),
            "humidity":    random.randint(30, 80),
            "wind_speed":  round(random.uniform(0.5, 12.0), 1),
            "description": "haze",
            "source":      f"fallback ({str(e)[:40]})"
        }

# ─────────────────────────────────────────
# LIVE TRAFFIC (TomTom)
# ─────────────────────────────────────────
def fetch_traffic(lat, lng):
    try:
        r = requests.get(
            "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json",
            params={"key": TOMTOM_KEY, "point": f"{lat},{lng}"},
            timeout=6
        )
        r.raise_for_status()
        d    = r.json().get("flowSegmentData", {})
        free = d.get("freeFlowSpeed", 60)
        curr = d.get("currentSpeed",  60)
        idx  = max(0.0, min(1.0, 1.0 - curr / max(free, 1)))
        return {
            "congestion_index": round(idx, 3),
            "traffic_level":    0 if idx < 0.3 else (1 if idx < 0.65 else 2),
            "current_speed":    curr,
            "free_flow_speed":  free,
            "source":           "live"
        }
    except Exception as e:
        idx = random.uniform(0.1, 0.85)
        return {
            "congestion_index": round(idx, 3),
            "traffic_level":    0 if idx < 0.3 else (1 if idx < 0.65 else 2),
            "current_speed":    round(random.uniform(15, 55), 1),
            "free_flow_speed":  60,
            "source":           f"fallback ({str(e)[:40]})"
        }

# ─────────────────────────────────────────
# ML CLASSIFIER
# ─────────────────────────────────────────
class HybridClassifier:
    LABELS = ["dust", "combustion", "mixed"]

    def __init__(self):
        self.rf     = RandomForestClassifier(n_estimators=120, random_state=42)
        self.scaler = StandardScaler()
        self.le     = LabelEncoder().fit(self.LABELS)
        self._train()

    def _train(self):
        rows = []
        random.seed(42)
        for _ in range(2000):
            pm25  = random.uniform(30, 280)
            pm10  = pm25 * random.uniform(1.05, 2.5)
            no2   = random.uniform(10, 100)
            aqi   = pm25 * random.uniform(1.7, 2.3)
            ratio = pm10 / pm25
            if ratio > 1.85:
                lbl = "dust"
            elif ratio < 1.35:
                lbl = "combustion"
            else:
                lbl = "mixed"
            rows.append([pm25, pm10, aqi, no2, lbl])

        df = pd.DataFrame(rows, columns=["pm25","pm10","aqi","no2","label"])
        X  = self.scaler.fit_transform(df[["pm25","pm10","aqi","no2"]])
        y  = self.le.transform(df["label"])
        self.rf.fit(X, y)

    def predict(self, pm25, pm10, aqi, no2):
        X     = self.scaler.transform([[pm25, pm10, aqi, no2]])
        proba = self.rf.predict_proba(X)[0]
        idx   = int(np.argmax(proba))
        return {
            "label":      self.le.inverse_transform([idx])[0],
            "confidence": round(float(proba[idx]), 3)
        }

clf = HybridClassifier()
print("✅ ML Classifier trained")

# ─────────────────────────────────────────
# FORECAST GENERATOR
# ─────────────────────────────────────────
def generate_forecast(zone_name, current_aqi):
    hist = list(aqi_history[zone_name])
    if len(hist) < 2:
        hist = [max(50, current_aqi + random.uniform(-40, 40)) for _ in range(5)]
        hist.append(current_aqi)
    trend  = (hist[-1] - hist[0]) / max(len(hist), 1)
    future = []
    base   = current_aqi
    for i in range(6):
        base += trend * 0.6 + random.uniform(-15, 15)
        base  = max(30, min(500, base))
        future.append(round(base, 1))
    return {"history": [round(v, 1) for v in hist], "forecast": future}

# ─────────────────────────────────────────
# DECISION ENGINE  ← KEY FIXES HERE
# ─────────────────────────────────────────
def run_decision_engine():
    MAX_TRUCKS  = 5
    threshold   = 180
    UNIFORM_WATER_PER_ZONE = 2000
    SPRAY_HIGH_WATER       = 1800
    SPRAY_LOW_WATER        = 900

    # ── STEP 1: Collect raw data for ALL zones first ──────────────────
    raw_zones = []
    for z in DELHI_ZONES:
        aqi_data = fetch_live_aqi(z)
        weather  = fetch_weather(z["lat"], z["lng"])
        traffic  = fetch_traffic(z["lat"], z["lng"])

        aqi_val  = aqi_data["aqi"]
        pm25     = aqi_data["pm25"]
        pm10     = aqi_data["pm10"]
        no2      = aqi_data["no2"]
        pm_ratio = round(pm10 / max(pm25, 0.1), 2)
        pclass   = clf.predict(pm25, pm10, aqi_val, no2)

        aqi_history[z["name"]].append(aqi_val)

        raw_zones.append({
            **z,
            "aqi":          aqi_val,
            "pm25":         pm25,
            "pm10":         pm10,
            "no2":          no2,
            "pm_ratio":     pm_ratio,
            "aqi_source":   aqi_data["source"],
            "weather":      weather,
            "traffic":      traffic,
            "pollution_type": pclass["label"],
            "confidence":   pclass["confidence"],
            "forecast":     generate_forecast(z["name"], aqi_val),
        })

    # ── STEP 2: Sort by AQI descending so highest-AQI zones get trucks first ──
    raw_zones.sort(key=lambda z: z["aqi"], reverse=True)

    # ── STEP 3: Assign trucks in AQI priority order ──────────────────
    trucks_deployed    = 0
    combustion_skipped = 0
    total_aqi          = 0.0
    people_covered     = 0
    water_used_L       = 0
    results            = []
    sprinklers         = {}

    for z in raw_zones:
        aqi_val     = z["aqi"]
        poll_type   = z["pollution_type"]
        wind_speed  = z["weather"]["wind_speed"]
        pm_ratio    = z["pm_ratio"]
        is_manual   = sprinkler_overrides.get(z["name"], False)

        final_action = "no_spray"
        reason       = ""
        truck        = False
        water_this   = 0

        if is_manual:
            # FIX: Manual override always activates spray regardless of AQI/type
            final_action = "spray_high"
            reason       = "Manual override active — sprinkler forced ON"
            water_this   = SPRAY_HIGH_WATER
            # Manual zones also get a truck if available
            if trucks_deployed < MAX_TRUCKS:
                truck = True
                trucks_deployed += 1
            people_covered += z["pop"]

        elif poll_type == "combustion":
            combustion_skipped += 1
            reason = f"Combustion source detected (PM ratio {pm_ratio}) — water spray ineffective on vehicular/fire emissions"

        elif aqi_val > threshold and wind_speed < 8:
            if aqi_val > 250:
                final_action = "spray_high"
                reason       = f"Hazardous dust AQI {aqi_val} with low wind ({wind_speed} m/s) — high-intensity spray"
                water_this   = SPRAY_HIGH_WATER
            else:
                final_action = "spray_low"
                reason       = f"Elevated dust AQI {aqi_val} — low-intensity preventive spray"
                water_this   = SPRAY_LOW_WATER

            # FIX: Only assign truck if below MAX_TRUCKS AND zone qualifies
            if trucks_deployed < MAX_TRUCKS:
                truck = True
                trucks_deployed += 1
            people_covered += z["pop"]

        elif wind_speed >= 8:
            reason = f"Wind speed {wind_speed} m/s too high — spray would disperse ineffectively"
        else:
            reason = f"AQI {aqi_val} below threshold {threshold} — no action required"

        water_used_L += water_this
        total_aqi    += aqi_val

        active = final_action != "no_spray"
        sprinklers[z["name"]] = {"active": active}

        results.append({
            **z,
            "final_action": final_action,
            "truck":        truck,
            "reason":       reason,
        })

    # ── STEP 4: Restore original zone order (by id) for consistent UI display ──
    results.sort(key=lambda z: z["id"])

    uniform_total = len(DELHI_ZONES) * UNIFORM_WATER_PER_ZONE
    water_saved_L = max(0, uniform_total - water_used_L)
    cost_saved    = int(water_saved_L * 8)

    return {
        "timestamp": datetime.now().isoformat(),
        "zones":     results,
        "sprinklers": sprinklers,
        "summary": {
            "avg_aqi":             round(total_aqi / len(DELHI_ZONES), 1),
            "trucks_deployed":     trucks_deployed,
            "combustion_skipped":  combustion_skipped,
            "water_saved_L":       water_saved_L,
            "cost_saved_INR":      cost_saved,
            "people_covered":      people_covered,
            "total_zones":         len(DELHI_ZONES),
        }
    }

# ─────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────
@app.route("/api/dashboard")
def dashboard():
    try:
        return jsonify(run_decision_engine())
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route("/api/status")
def status():
    return jsonify({
        "status": "ok",
        "time":   datetime.now().isoformat(),
        "keys": {
            "openweather": bool(OPENWEATHER_KEY),
            "tomtom":      bool(TOMTOM_KEY),
            "waqi":        bool(WAQI_KEY),
        }
    })

@app.route("/api/sprinkler/toggle", methods=["POST"])
def toggle_sprinkler():
    try:
        data      = request.get_json(force=True)
        zone_name = data.get("zone", "")
        if not zone_name:
            return jsonify({"error": "zone name required"}), 400
        current = sprinkler_overrides.get(zone_name, False)
        sprinkler_overrides[zone_name] = not current
        return jsonify({
            "zone":    zone_name,
            "active":  sprinkler_overrides[zone_name],
            "message": f"{'Activated' if sprinkler_overrides[zone_name] else 'Deactivated'} sprinkler for {zone_name}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sprinkler/status")
def sprinkler_status():
    return jsonify(sprinkler_overrides)

# ─────────────────────────────────────────
# RUN
# ─────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 AirOptima Real-Time Backend — Starting on http://localhost:5000")
    print(f"   OPENWEATHER_KEY : {'✅' if OPENWEATHER_KEY else '❌'}")
    print(f"   TOMTOM_KEY      : {'✅' if TOMTOM_KEY else '❌'}")
    print(f"   WAQI_KEY        : {'✅' if WAQI_KEY else '❌'}")
    app.run(host="0.0.0.0", port=5000, debug=True)