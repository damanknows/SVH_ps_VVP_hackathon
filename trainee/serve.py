"""
Trainee Microgrid Engine Standalone API Server
----------------------------------------------
Provides isolated testing and demonstration endpoints:
- POST /forecast: Probabilistic 24-hour ahead quantile forecast {p10, p50, p90}.
- POST /demo/scenario: Physical stress scenario presets (HEATWAVE, DROUGHT, STORM, MONSOON)
  derived directly from generate.py's verified boundary conditions.
- GET /health: Service and model status.
"""

from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
import os

from forecasting import get_quantile_forecast, forecaster
from features import engineer_features

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = FastAPI(title="VVP-Maker Microgrid Trainee Engine", version="2.0.0")


class ForecastRequest(BaseModel):
    horizon_h: int = 24
    current_weather: Optional[Dict[str, Any]] = None


class ScenarioRequest(BaseModel):
    scenario: str  # "HEATWAVE", "DROUGHT", "STORM", "MONSOON"


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "trainee-microgrid-engine",
        "inference_engine": "ONNX" if forecaster.onnx_available else "Joblib-PKL",
        "physics_version": forecaster.metadata.get("physics_version", "2.0.0"),
    }


@app.post("/forecast")
def post_forecast(req: ForecastRequest):
    """
    Returns probabilistic forecast with {p10, p50, p90} per target for Pair B and Pair C.
    """
    try:
        res = get_quantile_forecast(horizon_h=req.horizon_h, current_weather=req.current_weather)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/demo/scenario")
def post_demo_scenario(req: ScenarioRequest):
    """
    Injects physically-validated extreme stress scenarios for hackathon live judging.
    Preserves true physical cutoffs and returns corresponding quantile predictions.
    """
    scenario_key = req.scenario.upper().strip()
    data_path = os.path.join(BASE_DIR, "historical_campus_energy_data.csv")
    if not os.path.exists(data_path):
        raise HTTPException(status_code=404, detail="Stress dataset not found. Run generate.py first.")

    df = pd.read_csv(data_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = engineer_features(df)

    if scenario_key in ["HEATWAVE", "MAY_HEATWAVE"]:
        sub_df = df[(df["day_of_year"] >= 140) & (df["day_of_year"] <= 146)].head(24)
        label = "Rajasthan Severe Heatwave (Temp > 45 C, Chiller Surge)"
    elif scenario_key in ["DROUGHT", "WIND_DROUGHT"]:
        sub_df = df[(df["day_of_year"] >= 180) & (df["day_of_year"] <= 186)].head(24)
        label = "Extended Wind Drought (Wind < 2.5 m/s, Zero Wind Power)"
    elif scenario_key in ["STORM", "GALE_STORM"]:
        # Day 210 around 14:00-18:00
        sub_df = df[(df["day_of_year"] == 210)].head(24)
        label = "Severe Gale Storm (Wind > 25 m/s, Turbine Cut-Out Active)"
    elif scenario_key in ["MONSOON", "HEAVY_OVERCAST"]:
        sub_df = df[(df["day_of_year"] >= 230) & (df["day_of_year"] <= 236)].head(24)
        label = "Monsoon Heavy Cloudburst (100% Cloud Cover, Low Irradiance)"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{scenario_key}'. Choose from: HEATWAVE, DROUGHT, STORM, MONSOON",
        )

    predictions = forecaster.predict_quantiles(sub_df)
    predictions["scenario"] = scenario_key
    predictions["description"] = label
    return predictions


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("serve:app", host="127.0.0.1", port=8001, reload=False)
