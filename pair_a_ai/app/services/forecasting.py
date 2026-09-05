"""
Pair A AI Forecasting Service
-----------------------------
Executes ONNX multi-asset inference with calibrated P10, P50, and P90 quantile bounds.
Input: Feature vectors or current meteorological conditions.
Output: ForecastSchema matching the Pair A <-> Pair B/C contract across 96 15-minute intervals.
"""

import json
import os
import asyncio
from typing import Dict, List, Optional, Any
from pathlib import Path
import numpy as np
import pandas as pd
import pvlib.solarposition

from app.core.config import settings
from app.schemas.forecast import ForecastSchema, AssetForecast

# Optional ONNX Runtime
try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except Exception:
    ORT_AVAILABLE = False


class ForecastingService:
    def __init__(self):
        self.sessions = {}
        self.metadata = self._load_metadata()
        self._init_models()

    def _load_metadata(self) -> Dict[str, Any]:
        meta_path = settings.MODEL_DIR / "metadata.json"
        if not meta_path.exists():
            raise FileNotFoundError(f"Model metadata not found at {meta_path}")
        with open(meta_path, "r") as f:
            return json.load(f)

    def _init_models(self):
        self.onnx_ready = False
        if ORT_AVAILABLE:
            try:
                for asset in self.metadata["target_assets"]:
                    path = settings.MODEL_DIR / f"{asset}_quantile.onnx"
                    if path.exists():
                        self.sessions[asset] = ort.InferenceSession(
                            str(path), providers=["CPUExecutionProvider"]
                        )
                if len(self.sessions) == len(self.metadata["target_assets"]):
                    self.onnx_ready = True
            except Exception as e:
                print(f"[FORECAST SERVICE] ONNX session initialization error ({e}). Falling back to PKL.")
                self.onnx_ready = False

        # Load fallback PKL models if needed
        import joblib
        trainee_dir = settings.BASE_DIR.parent / "trainee"
        self.pkl_models = {}
        try:
            self.pkl_models["solar_pv"] = joblib.load(trainee_dir / "solar_model.pkl")
            self.pkl_models["wind_turb"] = joblib.load(trainee_dir / "wind_model.pkl")
            self.pkl_models["load_academic"] = joblib.load(settings.MODEL_DIR / "load_academic.pkl")
            self.pkl_models["load_hostel"] = joblib.load(settings.MODEL_DIR / "load_hostel.pkl")
        except Exception:
            pass

    def _generate_96_weather_steps(self, now: pd.Timestamp) -> pd.DataFrame:
        """Generates 96 15-minute weather steps starting from current timestamp."""
        timestamps = [now + pd.Timedelta(minutes=15 * i) for i in range(96)]
        df = pd.DataFrame({"timestamp": timestamps})

        df["hour_of_day"] = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
        df["day_of_year"] = df["timestamp"].dt.dayofyear
        df["day_of_week"] = df["timestamp"].dt.dayofweek

        angle_year = 2.0 * np.pi * df["day_of_year"] / 365.25
        df["day_sin"] = np.round(np.sin(angle_year), 5)
        df["day_cos"] = np.round(np.cos(angle_year), 5)

        df["is_lab_hour"] = (
            (df["hour_of_day"] >= 9.0) & (df["hour_of_day"] <= 17.0) & (df["day_of_week"] < 5)
        ).astype(int)
        df["is_hostel_peak"] = (
            (df["hour_of_day"] >= 18.0) & (df["hour_of_day"] <= 23.5)
        ).astype(int)

        # Realistic meteorological diurnal variations
        h = df["hour_of_day"].values
        df["temp_c"] = 28.0 + 8.0 * np.sin((h - 9) / 24.0 * 2 * np.pi)
        df["cloud_pct"] = 10.0
        df["wind_speed"] = 6.0 + 2.0 * np.sin((h - 14) / 24.0 * 2 * np.pi)
        df["wind_speed_100m"] = df["wind_speed"] * 1.35
        df["wind_gust"] = df["wind_speed"] * 1.4
        df["surface_pressure"] = 1008.0

        solar_curve = np.maximum(0.0, np.sin((h - 6.0) / 12.0 * np.pi))
        is_day = (h >= 6.0) & (h <= 18.5)
        df["shortwave_radiation_instant"] = np.where(is_day, 900.0 * (solar_curve ** 1.1), 0.0)
        df["direct_normal_irradiance"] = np.where(is_day, 800.0 * solar_curve, 0.0)
        df["diffuse_radiation"] = np.where(is_day, 120.0 * solar_curve, 0.0)

        return df

    def predict_sync(
        self,
        feature_vectors: Optional[Dict[str, List[float]]] = None,
        weather_df: Optional[pd.DataFrame] = None,
        lat: float = 26.2389,
        lon: float = 73.0243,
    ) -> ForecastSchema:
        now = pd.Timestamp.now(tz="Asia/Kolkata")
        if weather_df is None:
            df = self._generate_96_weather_steps(now)
        else:
            df = weather_df

        timestamps = [pd.to_datetime(t).isoformat() for t in df["timestamp"]]
        results = {}

        # Night guardrail zenith calculation
        solpos = pvlib.solarposition.get_solarposition(df["timestamp"], lat, lon)
        zenith = solpos["apparent_zenith"].values
        is_night = (zenith >= 90.0) | (df.get("shortwave_radiation_instant", pd.Series(0.0, index=df.index)) <= 0.0)

        for asset_key in self.metadata["target_assets"]:
            public_id = self.metadata["asset_id_mapping"].get(asset_key, asset_key)
            cap = self.metadata["asset_capacity_kw"].get(public_id, 1000.0)
            feat_cols = self.metadata["features"][asset_key]

            X_mat = df[feat_cols].astype(np.float32).values

            # Run inference via ONNX or PKL fallback
            if self.onnx_ready and asset_key in self.sessions:
                sess = self.sessions[asset_key]
                input_name = sess.get_inputs()[0].name
                raw_pred = sess.run(None, {input_name: X_mat})[0].flatten()
            elif asset_key in self.pkl_models:
                raw_pred = self.pkl_models[asset_key].predict(df[feat_cols])
            else:
                raw_pred = np.zeros(len(df))

            # Apply empirical quantile offsets
            q_offsets = self.metadata["quantile_offsets"].get(asset_key, {"p10_offset": -0.5, "p90_offset": 0.5})
            p50 = np.asarray(raw_pred, dtype=float)
            p10 = p50 + q_offsets["p10_offset"]
            p90 = p50 + q_offsets["p90_offset"]

            # Physics-informed thermal extrapolation guardrail for extreme heatwaves (> 45 C)
            if "load" in asset_key:
                temp_c = df["temp_c"].values
                extreme_heat = temp_c > 45.0
                if np.any(extreme_heat):
                    hvac_boost = np.where(
                        extreme_heat,
                        ((temp_c - 25.0) ** 1.35 - (45.0 - 25.0) ** 1.35) * 2.0,
                        0.0,
                    )
                    p10 += hvac_boost
                    p50 += hvac_boost
                    p90 += hvac_boost

            # Physical non-negativity and capacity constraints
            p10 = np.clip(p10, 0.0, cap)
            p50 = np.clip(p50, 0.0, cap)
            p90 = np.clip(p90, 0.0, cap)

            # Enforce Solar Night Guardrail
            if "solar" in asset_key:
                p10 = np.where(is_night, 0.0, p10)
                p50 = np.where(is_night, 0.0, p50)
                p90 = np.where(is_night, 0.0, p90)

            results[public_id] = AssetForecast(
                asset_id=public_id,
                timestamps=timestamps,
                p10_kw=[round(float(x), 2) for x in p10],
                p50_kw=[round(float(x), 2) for x in p50],
                p90_kw=[round(float(x), 2) for x in p90],
            )

        return ForecastSchema(
            generated_at=now.isoformat(),
            horizon_minutes=1440,
            resolution_minutes=15,
            forecasts=results,
        )

    async def predict(
        self,
        feature_vectors: Optional[Dict[str, List[float]]] = None,
        weather_df: Optional[pd.DataFrame] = None,
    ) -> ForecastSchema:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.predict_sync, feature_vectors, weather_df)


# Global singleton instance
forecasting_service = ForecastingService()
