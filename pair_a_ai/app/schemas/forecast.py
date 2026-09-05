"""
Forecast Schemas for Pair A
---------------------------
Defines Pydantic models for 15-minute 96-step multi-asset quantile forecasts.
"""

from typing import Dict, List
from pydantic import BaseModel, Field


class AssetForecast(BaseModel):
    asset_id: str
    timestamps: List[str]
    p10_kw: List[float] = Field(..., description="P10 quantile (10th percentile, conservative)")
    p50_kw: List[float] = Field(..., description="P50 quantile (50th percentile, median expectation)")
    p90_kw: List[float] = Field(..., description="P90 quantile (90th percentile, optimistic)")


class ForecastSchema(BaseModel):
    generated_at: str
    horizon_minutes: int = 1440
    resolution_minutes: int = 15
    forecasts: Dict[str, AssetForecast]


class ForecastRequest(BaseModel):
    feature_vectors: Dict[str, List[float]] = Field(
        ...,
        description="Dictionary mapping asset_id to its input feature vector"
    )
