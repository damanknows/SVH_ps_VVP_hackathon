"""
High-Performance Probabilistic ONNX Forecast Engine
---------------------------------------------------
Loads converted ONNX models for solar, wind, and campus load once into memory.
Executes batched ONNX Runtime inference and derives calibrated P10 (pessimistic)
and P90 (optimistic) uncertainty bounds using validated champion RMSE:
    P10 = max(0, P50 - 1.28 * RMSE)
    P90 = max(0, P50 + 1.28 * RMSE)

Enforces strict physical sanity rules:
- P10 <= P50 <= P90 monotonically
- Solar night values strictly 0.0 kW
- Non-negative wind and demand
"""

import os
import json
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
import onnxruntime as ort

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
METADATA_PATH = os.path.join(BASE_DIR, "model_metadata.json")
MODELS_ONNX_DIR = os.path.join(BASE_DIR, "models_onnx")


class ForecastEngine:
    """
    Singleton-friendly inference wrapper managing ONNX sessions and
    statistically sound prediction intervals.
    """

    def __init__(self, models_dir: Optional[str] = None, metadata_path: Optional[str] = None):
        self.models_dir = models_dir or MODELS_ONNX_DIR
        self.metadata_path = metadata_path or METADATA_PATH

        if not os.path.exists(self.metadata_path):
            raise FileNotFoundError(f"Model metadata not found at {self.metadata_path}")

        with open(self.metadata_path, "r") as f:
            self.metadata = json.load(f)

        # Extract champion RMSE per asset
        benchmarks = self.metadata.get("benchmarks", {})
        self.rmse = {
            "solar": float(benchmarks.get("solar", {}).get("champion_rmse_kw", 2.787)),
            "wind": float(benchmarks.get("wind", {}).get("champion_rmse_kw", 0.778)),
            "load": float(benchmarks.get("demand", {}).get("champion_rmse_kw", 0.566)),
            "demand": float(benchmarks.get("demand", {}).get("champion_rmse_kw", 0.566)),
        }

        self.features = {
            "solar": self.metadata["features"]["solar"],
            "wind": self.metadata["features"]["wind"],
            "load": self.metadata["features"]["demand"],
            "demand": self.metadata["features"]["demand"],
        }

        # Initialize ONNX runtime sessions once
        opts = ort.SessionOptions()
        opts.enable_mem_pattern = True
        opts.intra_op_num_threads = 2

        self.sessions = {
            "solar": ort.InferenceSession(os.path.join(self.models_dir, "solar_model.onnx"), sess_options=opts, providers=["CPUExecutionProvider"]),
            "wind": ort.InferenceSession(os.path.join(self.models_dir, "wind_model.onnx"), sess_options=opts, providers=["CPUExecutionProvider"]),
            "load": ort.InferenceSession(os.path.join(self.models_dir, "load_model.onnx"), sess_options=opts, providers=["CPUExecutionProvider"]),
            "demand": ort.InferenceSession(os.path.join(self.models_dir, "load_model.onnx"), sess_options=opts, providers=["CPUExecutionProvider"]),
        }

    def run(self, features_by_hour: np.ndarray, asset: str) -> Dict[str, List[float]]:
        """
        Executes point regression via ONNX and computes P10/P50/P90 quantile envelopes.

        Parameters:
        - features_by_hour: 2D numpy array of shape (N, num_features)
        - asset: 'solar', 'wind', 'load', or 'demand'

        Returns:
        - dict with keys 'p10', 'p50', 'p90' mapped to lists of floats
        """
        asset_key = asset.lower()
        if asset_key not in self.sessions:
            raise ValueError(f"Unknown asset '{asset}'. Valid options: {list(self.sessions.keys())}")

        session = self.sessions[asset_key]
        input_name = session.get_inputs()[0].name

        # Ensure float32 casting explicitly
        x_in = np.ascontiguousarray(features_by_hour, dtype=np.float32)
        if x_in.ndim == 1:
            x_in = x_in.reshape(1, -1)

        # Execute ONNX forward pass
        raw_pred = session.run(None, {input_name: x_in})[0].flatten()
        p50 = np.asarray(raw_pred, dtype=float)

        rmse_val = self.rmse[asset_key]
        # 1.28 corresponds to 80% prediction interval under normal errors (10th and 90th percentiles)
        delta = 1.28 * rmse_val

        # Derive initial quantiles
        p10 = p50 - delta
        p90 = p50 + delta

        # Apply domain-specific physical invariants
        if asset_key == "solar":
            # Hard solar night rule: if p50 is zero or negligible, irradiance is 0 -> p10 = p50 = p90 = 0.0
            is_dark = p50 <= 0.05
            p10 = np.where(is_dark, 0.0, np.maximum(0.0, p10))
            p50 = np.where(is_dark, 0.0, np.maximum(0.0, p50))
            p90 = np.where(is_dark, 0.0, np.maximum(0.0, p90))
            # Inverter cap from physics: 200 kW AC rating
            p90 = np.minimum(200.0, p90)
            p50 = np.minimum(200.0, p50)
            p10 = np.minimum(200.0, p10)
        elif asset_key == "wind":
            p10 = np.maximum(0.0, p10)
            p50 = np.maximum(0.0, p50)
            p90 = np.maximum(0.0, p90)
            # Generator nameplate cap: 50.0 kW
            p90 = np.minimum(50.0, p90)
            p50 = np.minimum(50.0, p50)
            p10 = np.minimum(50.0, p10)
        else:  # load / demand
            # Baseload minimum invariant: 70.0 kW uninterruptible infrastructure
            p10 = np.maximum(70.0, p10)
            p50 = np.maximum(70.0, p50)
            p90 = np.maximum(70.0, p90)

        # Monotonicity check: P10 <= P50 <= P90
        p10 = np.minimum(p10, p50)
        p90 = np.maximum(p90, p50)

        return {
            "p10": [round(float(v), 2) for v in p10],
            "p50": [round(float(v), 2) for v in p50],
            "p90": [round(float(v), 2) for v in p90],
        }

    def generate_probabilistic_forecast(self, weather_forecast_df: Optional[pd.DataFrame] = None) -> List[Dict[str, Any]]:
        """
        Generates 24-hour ahead probabilistic forecast records for solar, wind, and demand.
        If weather_forecast_df is None, generates realistic 24-hour diurnal profile.
        """
        if weather_forecast_df is None:
            # Construct a realistic upcoming 24h meteorological frame
            now = pd.Timestamp.now(tz="Asia/Kolkata").floor("h")
            times = pd.date_range(now, periods=24, freq="h")
            hours = times.hour
            doy = times.dayofyear
            dow = times.dayofweek

            # Solar irradiance approximation for Rajasthan
            is_day = (hours >= 6) & (hours <= 19)
            sun_ang = np.maximum(0.0, np.sin(np.pi * (hours - 6) / 13.0))
            ghi = np.where(is_day, 900.0 * (sun_ang ** 1.1), 0.0)
            dni = np.where(is_day, 800.0 * (sun_ang ** 1.2), 0.0)
            dhi = np.where(is_day, 120.0 * sun_ang, 0.0)
            temp = 28.0 + 8.0 * np.sin(2 * np.pi * (hours - 9) / 24.0)

            df = pd.DataFrame({
                "timestamp": times,
                "hour_of_day": hours,
                "day_of_year": doy,
                "day_of_week": dow,
                "cloud_pct": np.full(24, 15.0),
                "temp_c": temp,
                "shortwave_radiation_instant": ghi,
                "direct_normal_irradiance": dni,
                "diffuse_radiation": dhi,
                "wind_speed": np.full(24, 5.5),
                "wind_speed_100m": np.full(24, 7.5),
                "wind_gust": np.full(24, 8.0),
                "surface_pressure": np.full(24, 1008.0),
                "is_lab_hour": ((hours >= 9) & (hours <= 17) & (dow < 5)).astype(int),
                "is_hostel_peak": ((hours >= 18) & (hours <= 23)).astype(int),
            })
        else:
            df = weather_forecast_df.copy()

        # Extract features according to metadata
        solar_feats = df[self.features["solar"]].values.astype(np.float32)
        wind_feats = df[self.features["wind"]].values.astype(np.float32)
        demand_feats = df[self.features["demand"]].values.astype(np.float32)

        solar_pred = self.run(solar_feats, "solar")
        wind_pred = self.run(wind_feats, "wind")
        demand_pred = self.run(demand_feats, "load")

        results = []
        n_steps = len(df)
        for i in range(n_steps):
            ts_str = df["timestamp"].iloc[i].isoformat() if hasattr(df["timestamp"].iloc[i], "isoformat") else str(df["timestamp"].iloc[i])
            results.append({
                "timestamp": ts_str,
                "solar": {
                    "p10": solar_pred["p10"][i],
                    "p50": solar_pred["p50"][i],
                    "p90": solar_pred["p90"][i],
                },
                "wind": {
                    "p10": wind_pred["p10"][i],
                    "p50": wind_pred["p50"][i],
                    "p90": wind_pred["p90"][i],
                },
                "demand": {
                    "p10": demand_pred["p10"][i],
                    "p50": demand_pred["p50"][i],
                    "p90": demand_pred["p90"][i],
                },
            })

        return results
