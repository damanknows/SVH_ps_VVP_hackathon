from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime
import math
import random
import os
import sys

# Setup import paths to access trainee ML models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
for p in [BASE_DIR, PARENT_DIR, os.path.join(PARENT_DIR, "trainee")]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from forecasting import forecaster, get_quantile_forecast
    ML_ENGINE_AVAILABLE = True
except Exception as e:
    ML_ENGINE_AVAILABLE = False
    forecaster = None

app = FastAPI(
    title="VVP-Maker Microgrid Orchestrator API",
    version="2.1.0",
    description="Production Multi-Campus Virtual Power Plant & Energy Management API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Campus Hardware & Micro-climate Benchmarks ────────────────────────────────
CAMPUS_PROFILES: Dict[str, Dict[str, Any]] = {
    "gec-bikaner": {
        "id": "gec-bikaner",
        "name": "GEC Bikaner - Main Campus",
        "city": "Bikaner",
        "solar_installed_kw": 220,
        "capacity_kw": 350,
        "battery_capacity_kwh": 400,
        "solar_mult": 1.0,
        "wind_mult": 1.3,       # High desert wind corridor
        "load_mult": 1.0,
        "lat": 28.0229,
        "lon": 73.3119,
    },
    "mbm-jodhpur": {
        "id": "mbm-jodhpur",
        "name": "MBM University - Jodhpur",
        "city": "Jodhpur",
        "solar_installed_kw": 310,
        "capacity_kw": 500,
        "battery_capacity_kwh": 600,
        "solar_mult": 1.41,      # 310 / 220
        "wind_mult": 1.05,
        "load_mult": 1.43,      # 500 / 350
        "lat": 26.2389,
        "lon": 73.0243,
    },
    "rtu-kota": {
        "id": "rtu-kota",
        "name": "RTU Kota - Technical Campus",
        "city": "Kota",
        "solar_installed_kw": 250,
        "capacity_kw": 450,
        "battery_capacity_kwh": 500,
        "solar_mult": 1.14,      # 250 / 220
        "wind_mult": 0.85,      # River basin, lower wind
        "load_mult": 1.28,      # 450 / 350
        "lat": 25.2138,
        "lon": 75.8648,
    },
    "ctae-udaipur": {
        "id": "ctae-udaipur",
        "name": "CTAE Udaipur - Green Campus",
        "city": "Udaipur",
        "solar_installed_kw": 180,
        "capacity_kw": 300,
        "battery_capacity_kwh": 350,
        "solar_mult": 0.82,      # 180 / 220
        "wind_mult": 0.95,
        "load_mult": 0.85,      # 300 / 350
        "lat": 24.5854,
        "lon": 73.7125,
    },
}

def generate_24h_forecast(scenario: str, campus_id: str = "gec-bikaner"):
    campus = CAMPUS_PROFILES.get(campus_id, CAMPUS_PROFILES["gec-bikaner"])
    s_mult = campus["solar_mult"]
    w_mult = campus["wind_mult"]
    l_mult = campus["load_mult"]

    items = []
    for h in range(24):
        hour_str = f"{h:02d}:00"
        is_peak_tariff = 18 <= h <= 22
        
        solar_kw = 0.0
        wind_kw = 0.0
        base_demand = (120 + math.sin((h - 8) / 3) * 35) * l_mult

        if scenario == "SUNNY_PEAK":
            if 6 <= h <= 18:
                solar_factor = math.sin(((h - 6) / 12) * math.pi)
                solar_kw = round(210 * s_mult * math.pow(solar_factor, 1.2))
            wind_kw = round((20 + ((h * 7) % 15)) * w_mult)
        elif scenario == "CLOUDY_AFTERNOON":
            if 6 <= h <= 18:
                solar_factor = math.sin(((h - 6) / 12) * math.pi)
                cloud_dip = 0.35 if 12 <= h <= 15 else 0.8
                solar_kw = round(140 * s_mult * solar_factor * cloud_dip)
            wind_kw = round((35 + ((h * 11) % 20)) * w_mult)
        elif scenario == "WINDY_NIGHT":
            if 7 <= h <= 17:
                solar_factor = math.sin(((h - 7) / 10) * math.pi)
                solar_kw = round(60 * s_mult * solar_factor)
            wind_kw = round((110 + math.sin(h / 3) * 25) * w_mult)
            base_demand = max(90 * l_mult, base_demand * 0.85)
        else:
            if 6 <= h <= 18:
                solar_factor = math.sin(((h - 6) / 12) * math.pi)
                solar_kw = round(180 * s_mult * solar_factor)
            wind_kw = round(25 * w_mult)

        total_green = solar_kw + wind_kw
        is_surplus = total_green > base_demand

        # Dynamic battery state-of-charge curve
        battery_soc = 50.0
        if h < 6:
            battery_soc = max(30.0, 70.0 - h * 4.0)
        elif 11 <= h <= 15:
            battery_soc = min(95.0, 55.0 + (h - 10) * 8.0)
        elif 18 <= h <= 22:
            battery_soc = max(25.0, 85.0 - (h - 17) * 12.0)
        else:
            battery_soc = 65.0

        grid_import_kw = 0.0
        if total_green < base_demand:
            grid_import_kw = max(0.0, round(base_demand - total_green - (25 if is_peak_tariff else 10)))

        items.append({
            "hour": hour_str,
            "solar_kw": max(0.0, round(solar_kw, 1)),
            "wind_kw": max(0.0, round(wind_kw, 1)),
            "demand_kw": round(base_demand, 1),
            "battery_soc": round(battery_soc, 1),
            "grid_import_kw": round(grid_import_kw, 1),
            "is_surplus": is_surplus,
            "is_peak_tariff": is_peak_tariff,
        })
    return items

@app.get("/health")
@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "service": "vvp-maker-backend",
        "ml_engine_available": ML_ENGINE_AVAILABLE,
        "inference_mode": "ONNX/PKL Surrogate" if ML_ENGINE_AVAILABLE else "Empirical Physics",
        "active_campuses": list(CAMPUS_PROFILES.keys()),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/campuses")
def get_campuses():
    return list(CAMPUS_PROFILES.values())

@app.get("/api/forecast/24h")
def get_forecast_24h(
    scenario: str = Query("SUNNY_PEAK"),
    campus_id: str = Query("gec-bikaner")
):
    return generate_24h_forecast(scenario=scenario, campus_id=campus_id)

@app.get("/api/model/status")
def get_model_status():
    if ML_ENGINE_AVAILABLE and forecaster is not None:
        return {
            "status": "active",
            "metadata": forecaster.metadata,
            "features": {
                "solar": forecaster.solar_features,
                "wind": forecaster.wind_features,
                "demand": forecaster.demand_features,
            },
            "onnx_available": getattr(forecaster, "onnx_available", False),
        }
    return {
        "status": "fallback_mode",
        "reason": "Trainee engine loaded in empirical physics fallback mode."
    }

@app.get("/api/model/forecast")
def get_model_forecast(
    horizon_h: int = Query(24, ge=1, le=96),
    campus_id: str = Query("gec-bikaner")
):
    """Executes probabilistic inference {p10, p50, p90} using champion ML models."""
    campus = CAMPUS_PROFILES.get(campus_id, CAMPUS_PROFILES["gec-bikaner"])
    if ML_ENGINE_AVAILABLE:
        try:
            return get_quantile_forecast(horizon_h=horizon_h)
        except Exception as e:
            pass
    # Safe fallback if ML runner not available
    return {
        "timestamps": [f"{h:02d}:00" for h in range(horizon_h)],
        "solar": {"p50": [f["solar_kw"] for f in generate_24h_forecast("SUNNY_PEAK", campus_id)[:horizon_h]]},
        "wind": {"p50": [f["wind_kw"] for f in generate_24h_forecast("SUNNY_PEAK", campus_id)[:horizon_h]]},
        "demand": {"p50": [f["demand_kw"] for f in generate_24h_forecast("SUNNY_PEAK", campus_id)[:horizon_h]]},
        "inference_engine": "empirical_surrogate"
    }

@app.get("/api/recommendations")
def get_recommendations(campus_id: str = Query("gec-bikaner")):
    campus = CAMPUS_PROFILES.get(campus_id, CAMPUS_PROFILES["gec-bikaner"])
    name = campus["name"]
    mult = campus["load_mult"]

    rec1_savings = round(1850 * mult)
    rec2_savings = round(2400 * mult)
    rec3_savings = round(950 * campus["solar_mult"])
    rec4_savings = round(1120 * mult)

    return [
        {
            "id": "rec-1",
            "type": "LOAD_SHIFT",
            "priority": "HIGH",
            "title": f"Shift Heavy Workshop Load • {name}",
            "action": f"Schedule CNC milling & heavy machinery operation between 12:30 - 15:00 during Solar Surplus Window at {name}.",
            "financial_impact": f"Save ₹{rec1_savings:,} in peak tariff surcharges",
            "carbon_impact": f"{round(54 * mult)} kg CO₂ avoided today",
            "status": "PENDING",
        },
        {
            "id": "rec-2",
            "type": "BATTERY_DISCHARGE",
            "priority": "HIGH",
            "title": f"Pre-Discharge BESS for Evening Peak Tariff ({campus['battery_capacity_kwh']} kWh)",
            "action": f"Discharge BESS into campus microgrid from 18:30 to 21:00 to avoid expensive grid draw.",
            "financial_impact": f"Save ₹{rec2_savings:,} during peak ₹11.5/kWh rate",
            "carbon_impact": f"{round(78 * mult)} kg CO₂ avoided",
            "status": "PENDING",
        },
        {
            "id": "rec-3",
            "type": "BATTERY_CHARGE",
            "priority": "MEDIUM",
            "title": f"Pre-Charge BESS using Rooftop Solar Surplus",
            "action": f"Ramp charging rate to +{round(45 * campus['solar_mult'])} kW between 11:00 and 14:00 to store excess solar production.",
            "financial_impact": f"Utilize ₹{rec3_savings:,} of zero-cost solar power",
            "carbon_impact": f"{round(38 * campus['solar_mult'])} kg CO₂ sequestered equivalent",
            "status": "PENDING",
        },
        {
            "id": "rec-4",
            "type": "CURTAILMENT",
            "priority": "LOW",
            "title": "Smart HVAC Staggering in Library Block",
            "action": f"Stagger chiller block startups by 15 minutes to reduce campus peak demand spike.",
            "financial_impact": f"Reduce maximum demand charge by ₹{rec4_savings:,}/mo",
            "carbon_impact": f"{round(22 * mult)} kg CO₂ avoided",
            "status": "PENDING",
        },
    ]

@app.get("/api/telemetry/current")
def get_telemetry_current(
    scenario: str = Query("SUNNY_PEAK"),
    hour: int = Query(14),
    campus_id: str = Query("gec-bikaner"),
    live: bool = Query(False)
):
    campus = CAMPUS_PROFILES.get(campus_id, CAMPUS_PROFILES["gec-bikaner"])
    forecast = generate_24h_forecast(scenario=scenario, campus_id=campus_id)
    
    hour = min(23, max(0, hour))
    current = forecast[hour]

    # Sensor jitter for live SCADA streaming
    jitter = random.uniform(-0.015, 0.015) if live else 0.0

    solar_kw = max(0.0, round(current["solar_kw"] * (1.0 + jitter), 1))
    wind_kw = max(0.0, round(current["wind_kw"] * (1.0 + jitter), 1))
    demand_kw = max(10.0, round(current["demand_kw"] * (1.0 + jitter), 1))

    total_gen = solar_kw + wind_kw
    net_power = total_gen - demand_kw

    max_charge = round(50.0 * (campus["battery_capacity_kwh"] / 400.0))
    max_discharge = round(45.0 * (campus["battery_capacity_kwh"] / 400.0))

    battery_power_kw = 0.0
    grid_import_kw = 0.0
    grid_export_kw = 0.0

    if net_power > 0:
        battery_power_kw = min(float(max_charge), round(net_power, 1))
        grid_export_kw = max(0.0, round(net_power - battery_power_kw, 1))
    else:
        deficit = abs(net_power)
        battery_power_kw = -min(float(max_discharge), round(deficit, 1))
        grid_import_kw = max(0.0, round(deficit - abs(battery_power_kw), 1))

    rupees_saved = round((3800 + hour * 240 + (850 if scenario == "SUNNY_PEAK" else 200)) * campus["load_mult"])
    co2_saved_kg = round((280 + hour * 18.5 + (45 if scenario == "WINDY_NIGHT" else 15)) * campus["load_mult"], 1)

    now = datetime.now()
    now = now.replace(hour=hour, minute=now.minute if live else 30, second=0, microsecond=0)

    return {
        "timestamp": now.isoformat(),
        "campus_id": campus_id,
        "campus_name": campus["name"],
        "solar_kw": solar_kw,
        "wind_kw": wind_kw,
        "demand_kw": demand_kw,
        "battery_soc": current["battery_soc"],
        "battery_power_kw": battery_power_kw,
        "grid_import_kw": grid_import_kw,
        "grid_export_kw": grid_export_kw,
        "co2_saved_kg": co2_saved_kg,
        "rupees_saved": rupees_saved,
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
