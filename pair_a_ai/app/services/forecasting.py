"""
Forecasting Service
-------------------
Loads multi-output ONNX quantile models for 4 assets:
- solar-pv-block-a
- wind-turb-1
- load-academic
- load-hostel

Generates 15-minute resolution P10, P50, P90 quantile forecasts over 96 steps (24 hours).
"""

import os
import json
import asyncio
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
import onnxruntime as ort

from app.core.config import settings
from app.schemas.forecast import ForecastSchema, AssetForecast


class ForecastingService:
    def __init__(self):
        self.sessions: Dict[str, ort.InferenceSession] = {}
        self.metadata = self._load_metadata()
        model_file_map = self.metadata.get("asset_model_files", {
            "solar-pv-block-a": "solar_pv_quantile.onnx",
            "wind-turb-1": "wind_turb_quantile.onnx",
            "load-academic": "load_academic_quantile.onnx",
            "load-hostel": "load_hostel_quantile.onnx"
        })

        for asset in self.metadata["target_assets"]:
            # Locate ONNX file
            fname = model_file_map.get(asset, f"{asset.replace('-', '_')}_quantile.onnx")
            path = settings.MODEL_DIR / fname
            if not path.exists():
                raise FileNotFoundError(f"ONNX model for {asset} not found at {path}")
            self.sessions[asset] = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])

    def _load_metadata(self) -> Dict:
        metadata_file = settings.MODEL_DIR / "metadata.json"
        if not metadata_file.exists():
            raise FileNotFoundError(f"Model metadata not found at {metadata_file}")
        with open(metadata_file, "r") as f:
            return json.load(f)

    def _get_default_feature_vector(self, asset_id: str) -> List[float]:
        """Provides realistic default feature values if caller omitted them."""
        n_feats = len(self.metadata["features"].get(asset_id, [0] * 14))
        return [1.0] * n_feats

    async def predict(self, feature_vectors: Optional[Dict[str, List[float]]] = None) -> ForecastSchema:
        """
        Asynchronously computes 96-step P10/P50/P90 quantile forecasts.
        """
        results = {}
        now = pd.Timestamp.now(tz="Asia/Kolkata")
        timestamps = [(now + pd.Timedelta(minutes=15 * i)).isoformat() for i in range(settings.HORIZON_STEPS)]
        feature_vectors = feature_vectors or {}

        for asset_id, session in self.sessions.items():
            feats_list = feature_vectors.get(asset_id)
            if not feats_list:
                feats_list = self._get_default_feature_vector(asset_id)

            feats = np.array([feats_list], dtype=np.float32)

            # Run inference in threadpool to keep event loop non-blocking
            loop = asyncio.get_running_loop()
            input_name = session.get_inputs()[0].name
            preds = await loop.run_in_executor(
                None,
                lambda s=session, inp=input_name, f=feats: s.run(None, {inp: f})[0]
            )

            # preds shape: (1, 96, 3)
            p10 = np.maximum(0, preds[0, :, 0]).tolist()
            p50 = np.maximum(0, preds[0, :, 1]).tolist()
            p90 = np.maximum(0, preds[0, :, 2]).tolist()

            # Monotonicity check
            for i in range(len(p50)):
                if p10[i] > p50[i]:
                    p10[i] = p50[i]
                if p90[i] < p50[i]:
                    p90[i] = p50[i]

            # Physical capacity clipping
            cap = self.metadata["asset_capacity_kw"].get(asset_id, 1e6)
            results[asset_id] = AssetForecast(
                asset_id=asset_id,
                timestamps=timestamps,
                p10_kw=[round(min(float(x), cap), 2) for x in p10],
                p50_kw=[round(min(float(x), cap), 2) for x in p50],
                p90_kw=[round(min(float(x), cap), 2) for x in p90]
            )

        return ForecastSchema(
            generated_at=now.isoformat(),
            horizon_minutes=settings.HORIZON_MINUTES,
            resolution_minutes=settings.RESOLUTION_MINUTES,
            forecasts=results
        )

    def predict_sync(self, feature_vectors: Optional[Dict[str, List[float]]] = None) -> ForecastSchema:
        """Synchronous version for non-async contexts or offline tests."""
        results = {}
        now = pd.Timestamp.now(tz="Asia/Kolkata")
        timestamps = [(now + pd.Timedelta(minutes=15 * i)).isoformat() for i in range(settings.HORIZON_STEPS)]
        feature_vectors = feature_vectors or {}

        for asset_id, session in self.sessions.items():
            feats_list = feature_vectors.get(asset_id) or self._get_default_feature_vector(asset_id)
            feats = np.array([feats_list], dtype=np.float32)
            input_name = session.get_inputs()[0].name
            preds = session.run(None, {input_name: feats})[0]

            p10 = np.maximum(0, preds[0, :, 0]).tolist()
            p50 = np.maximum(0, preds[0, :, 1]).tolist()
            p90 = np.maximum(0, preds[0, :, 2]).tolist()

            cap = self.metadata["asset_capacity_kw"].get(asset_id, 1e6)
            results[asset_id] = AssetForecast(
                asset_id=asset_id,
                timestamps=timestamps,
                p10_kw=[round(min(float(x), cap), 2) for x in p10],
                p50_kw=[round(min(float(x), cap), 2) for x in p50],
                p90_kw=[round(min(float(x), cap), 2) for x in p90]
            )

        return ForecastSchema(
            generated_at=now.isoformat(),
            horizon_minutes=settings.HORIZON_MINUTES,
            resolution_minutes=settings.RESOLUTION_MINUTES,
            forecasts=results
        )
