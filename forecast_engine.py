"""
Campus Microgrid 24-Hour Predictive Forecast Engine
---------------------------------------------------
Fetches live forward-looking meteorological forecasts for Jodhpur from Open-Meteo,
validates model metadata version consistency with physics.py,
and executes inference using the champion trained Machine Learning models.

Returns clean JSON contract for Pair B (Backend API) and Pair C (Dashboard).
"""

import os
import json
import requests
import pandas as pd
import joblib
from physics import PHYSICS_VERSION

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
METADATA_PATH = os.path.join(BASE_DIR, "model_metadata.json")


def load_models_and_metadata():
    """Validates physics version and loads champion models dynamically."""
    if not os.path.exists(METADATA_PATH):
        raise FileNotFoundError(f"Model metadata not found at {METADATA_PATH}. Run train_real_models.py first.")

    with open(METADATA_PATH, "r") as f:
        metadata = json.load(f)

    # Fail loudly if model was trained against a different physics version
    trained_version = metadata.get("physics_version")
    if trained_version != PHYSICS_VERSION:
        raise RuntimeError(
            f"Physics version mismatch! Model was trained with physics {trained_version}, "
            f"but current runtime physics is {PHYSICS_VERSION}. Retrain models via train_real_models.py."
        )

    solar_model = joblib.load(os.path.join(BASE_DIR, "solar_model.pkl"))
    wind_model = joblib.load(os.path.join(BASE_DIR, "wind_model.pkl"))
    demand_model = joblib.load(os.path.join(BASE_DIR, "demand_model.pkl"))

    return solar_model, wind_model, demand_model, metadata


def forecast_next_24_hours(lat: float = 26.2389, lon: float = 73.0243):
    """
    Generates high-fidelity 24-hour ahead predictions for campus solar, wind, and demand.
    """
    solar_model, wind_model, demand_model, metadata = load_models_and_metadata()
    solar_features = metadata["features"]["solar"]
    wind_features = metadata["features"]["wind"]
    demand_features = metadata["features"]["demand"]

    # Fetch live forecast from Open-Meteo
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=temperature_2m,cloud_cover,wind_speed_10m,wind_speed_100m,wind_gusts_10m,"
        f"shortwave_radiation_instant,direct_normal_irradiance,diffuse_radiation,surface_pressure&"
        f"forecast_days=2&timezone=Asia/Kolkata"
    )

    response = requests.get(url, timeout=30)
    if response.status_code != 200:
        raise RuntimeError(f"Open-Meteo forecast API failed: {response.text[:200]}")

    df = pd.DataFrame(response.json()["hourly"])

    # Clean and rename features
    df.rename(columns={
        "time": "timestamp",
        "temperature_2m": "temp_c",
        "cloud_cover": "cloud_pct",
        "wind_speed_10m": "wind_speed",
        "wind_gusts_10m": "wind_gust"
    }, inplace=True)

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    if df["timestamp"].dt.tz is None:
        df["timestamp"] = df["timestamp"].dt.tz_localize("Asia/Kolkata")

    # Filter to upcoming 24 hours starting from current hour
    now = pd.Timestamp.now(tz="Asia/Kolkata").floor("h")
    df = df[df["timestamp"] >= now].head(24).copy().reset_index(drop=True)

    # Feature Engineering
    df["hour_of_day"] = df["timestamp"].dt.hour
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_lab_hour"] = ((df["hour_of_day"] >= 9) & (df["hour_of_day"] <= 17) & (df["day_of_week"] < 5)).astype(int)
    df["is_hostel_peak"] = ((df["hour_of_day"] >= 18) & (df["hour_of_day"] <= 23)).astype(int)

    # Inference with Champion Models
    df["solar_kw"] = solar_model.predict(df[solar_features]).round(1)
    df["wind_kw"] = wind_model.predict(df[wind_features]).round(1)
    df["demand_kw"] = demand_model.predict(df[demand_features]).round(1)

    # Clean JSON contract for Pair B & Pair C
    forecast_output = []
    for _, row in df.iterrows():
        forecast_output.append({
            "timestamp": row["timestamp"].isoformat(),
            "predicted_solar_kw": max(0.0, float(row["solar_kw"])),
            "predicted_wind_kw": max(0.0, float(row["wind_kw"])),
            "predicted_demand_kw": max(0.0, float(row["demand_kw"]))
        })

    return forecast_output


if __name__ == "__main__":
    print(f"Executing 24-hour predictive forecast engine (Physics Version: {PHYSICS_VERSION})...\n")
    predictions = forecast_next_24_hours()
    print(f"Generated {len(predictions)} hourly forecasts. First 3 hours preview:")
    for p in predictions[:3]:
        print(f"  {p['timestamp']} | Solar: {p['predicted_solar_kw']:5.1f} kW | Wind: {p['predicted_wind_kw']:5.1f} kW | Demand: {p['predicted_demand_kw']:5.1f} kW")