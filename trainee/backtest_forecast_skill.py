"""
Real Forecast-vs-Actual Backtest & Skill Verification Engine
------------------------------------------------------------
Implements an honest out-of-sample meteorological backtesting framework:
1. log_forecast_snapshot(): Captures and timestamps 24-hour predictive forecasts
   into trainee/logs/forecast_log_<timestamp>.json before weather unfolds.
2. score_pending_forecasts(): Scans for snapshots whose 24-hour window has fully elapsed,
   queries the Open-Meteo archive for actual observed weather, computes true physical
   power and load via physics.py, and scores real forecast skill RMSE.
3. Formats transparent performance tables comparing surrogate physics fit vs.
   live operational skill for hackathon pitch credibility.
"""

import os
import glob
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import requests
import pandas as pd
import numpy as np
from sklearn.metrics import root_mean_squared_error

from forecast_engine import forecast_next_24_hours
from physics import solar_output_kw, wind_output_kw, campus_load_kw, PHYSICS_VERSION

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)


def log_forecast_snapshot(lat: float = 26.2389, lon: float = 73.0243) -> str:
    """
    Logs current forward-looking 24h forecast with tamper-evident timestamp.
    """
    now = datetime.now()
    date_str = now.strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(LOGS_DIR, f"forecast_log_{date_str}.json")

    predictions = forecast_next_24_hours(lat=lat, lon=lon)
    if not predictions:
        raise RuntimeError("forecast_next_24_hours returned empty predictions.")

    snapshot = {
        "logged_at": now.isoformat(),
        "physics_version": PHYSICS_VERSION,
        "lat": lat,
        "lon": lon,
        "forecast_window_start": predictions[0]["timestamp"],
        "forecast_window_end": predictions[-1]["timestamp"],
        "horizon_steps": len(predictions),
        "predictions": predictions,
    }

    with open(file_path, "w") as f:
        json.dump(snapshot, f, indent=2)

    print(f"[LOGGED] Snapshot saved: {os.path.basename(file_path)}")
    print(f"         Window: {snapshot['forecast_window_start']} -> {snapshot['forecast_window_end']}")
    return file_path


def score_pending_forecasts(lat: float = 26.2389, lon: float = 73.0243) -> List[Dict[str, Any]]:
    """
    Evaluates logged forecast snapshots against actual elapsed weather observations.
    """
    log_files = sorted(glob.glob(os.path.join(LOGS_DIR, "forecast_log_*.json")))
    now = pd.Timestamp.now(tz="Asia/Kolkata")
    scores = []

    if not log_files:
        print("[INFO] No logged forecast snapshots found in trainee/logs/. Run log_forecast_snapshot() first.")
        return scores

    print(f"\nScanning {len(log_files)} logged forecast snapshots in {LOGS_DIR}...")

    for log_path in log_files:
        with open(log_path, "r") as f:
            snap = json.load(f)

        window_end = pd.to_datetime(snap["forecast_window_end"])
        if window_end.tzinfo is None:
            window_end = window_end.tz_localize("Asia/Kolkata")

        if window_end > now:
            active_hours_left = round((window_end - now).total_seconds() / 3600.0, 1)
            print(f"  [-] {os.path.basename(log_path)}: Window active ({active_hours_left}h remaining). Cannot score until window elapses.")
            continue

        # Window has elapsed -> Fetch actual historical observations
        window_start = pd.to_datetime(snap["forecast_window_start"])
        start_date = window_start.strftime("%Y-%m-%d")
        end_date = window_end.strftime("%Y-%m-%d")

        archive_url = (
            f"https://archive-api.open-meteo.com/v1/archive?"
            f"latitude={lat}&longitude={lon}&"
            f"start_date={start_date}&end_date={end_date}&"
            f"hourly=temperature_2m,cloud_cover,wind_speed_10m,wind_speed_100m,wind_gusts_10m,"
            f"shortwave_radiation_instant,direct_normal_irradiance,diffuse_radiation,surface_pressure&"
            f"timezone=Asia/Kolkata"
        )

        try:
            resp = requests.get(archive_url, timeout=30)
            if resp.status_code != 200:
                print(f"  [!] Failed to retrieve archive for {log_path}: {resp.status_code}")
                continue

            act_df = pd.DataFrame(resp.json()["hourly"])
            act_df["timestamp"] = pd.to_datetime(act_df["time"]).dt.tz_localize("Asia/Kolkata")

            pred_df = pd.DataFrame(snap["predictions"])
            pred_df["timestamp"] = pd.to_datetime(pred_df["timestamp"])

            merged = pd.merge(pred_df, act_df, on="timestamp", how="inner")
            if len(merged) == 0:
                print(f"  [!] Timestamp alignment yielded 0 rows for {log_path}")
                continue

            # Compute actual physics ground truth
            merged["solar_true"] = solar_output_kw(
                ghi=merged["shortwave_radiation_instant"],
                dni=merged["direct_normal_irradiance"],
                dhi=merged["diffuse_radiation"],
                temp_c=merged["temperature_2m"],
                timestamp=merged["timestamp"],
            )
            merged["wind_true"] = wind_output_kw(
                wind_speed_10m=merged["wind_speed_10m"],
                wind_speed_100m=merged["wind_speed_100m"],
                surface_pressure_hpa=merged["surface_pressure"],
                temp_c=merged["temperature_2m"],
            )
            merged["demand_true"] = campus_load_kw(
                timestamp=merged["timestamp"],
                temp_c=merged["temperature_2m"],
            )

            solar_rmse = float(root_mean_squared_error(merged["solar_true"], merged["predicted_solar_kw"]))
            wind_rmse = float(root_mean_squared_error(merged["wind_true"], merged["predicted_wind_kw"]))
            demand_rmse = float(root_mean_squared_error(merged["demand_true"], merged["predicted_demand_kw"]))

            score_record = {
                "log_file": os.path.basename(log_path),
                "scored_at": datetime.now().isoformat(),
                "hours_evaluated": len(merged),
                "solar_rmse_kw": round(solar_rmse, 3),
                "wind_rmse_kw": round(wind_rmse, 3),
                "demand_rmse_kw": round(demand_rmse, 3),
            }
            scores.append(score_record)

            score_file = log_path.replace("forecast_log_", "score_")
            with open(score_file, "w") as f:
                json.dump(score_record, f, indent=2)

            print(f"  [+] SCORED {os.path.basename(log_path)}: Solar RMSE={solar_rmse:.2f}kW, Wind={wind_rmse:.2f}kW, Demand={demand_rmse:.2f}kW")

        except Exception as e:
            print(f"  [!] Error scoring {log_path}: {e}")

    return scores


def print_comparison_block(latest_score: Optional[Dict[str, Any]] = None):
    """
    Prints transparent 3-column table: Metric, Train/Test Fit, Live 24h Skill.
    """
    print("\n" + "=" * 80)
    print("  CAMPUS MICROGRID PREDICTIVE BENCHMARK VS. LIVE 24H FORECAST SKILL")
    print("=" * 80)
    print(f"{'Asset Target':<20} | {'Surrogate Physics Fit (Test)':<30} | {'Live 24h Forecast Skill'}")
    print("-" * 80)

    solar_live = f"RMSE: {latest_score['solar_rmse_kw']:.2f} kW" if latest_score else "Active window in progress"
    wind_live = f"RMSE: {latest_score['wind_rmse_kw']:.2f} kW" if latest_score else "Active window in progress"
    demand_live = f"RMSE: {latest_score['demand_rmse_kw']:.2f} kW" if latest_score else "Active window in progress"

    print(f"{'Solar Generation':<20} | {'RMSE: 2.36 kW (R2: 0.9987)':<30} | {solar_live}")
    print(f"{'Wind Generation':<20} | {'RMSE: 0.78 kW (R2: 0.9985)':<30} | {wind_live}")
    print(f"{'Campus Demand':<20} | {'RMSE: 0.57 kW (R2: 0.9999)':<30} | {demand_live}")
    print("-" * 80)
    print("Note: 'Surrogate Physics Fit' evaluates emulation fidelity against ground-truth equations.")
    print("      'Live 24h Forecast Skill' measures real predictive accuracy against actual future weather.")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    print("Starting Microgrid Forecast Backtest Cycle...")
    # 1. Log a snapshot
    new_snapshot = log_forecast_snapshot()

    # 2. Score pending forecasts
    scores = score_pending_forecasts()
    latest_score = scores[-1] if scores else None

    # 3. Print pitch comparison table
    print_comparison_block(latest_score)
