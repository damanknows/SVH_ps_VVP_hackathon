"""
Forecast Pydantic Schemas
-------------------------
Matches Pair A <-> Pair B/C data contracts:
P10, P50, P90 probabilistic arrays for solar, wind, and institutional loads.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class AssetForecast(BaseModel):
    asset_id: str
    timestamps: List[str]
    p10_kw: List[float] = Field(..., description="10th percentile (conservative lower bound)")
    p50_kw: List[float] = Field(..., description="50th percentile (median expected value)")
    p90_kw: List[float] = Field(..., description="90th percentile (optimistic upper bound)")


class ForecastSchema(BaseModel):
    generated_at: str
    horizon_minutes: int = 1440  # 24 hours
    resolution_minutes: int = 15  # 96 steps
    forecasts: Dict[str, AssetForecast]


class ForecastRequest(BaseModel):
    horizon_h: int = 24
    current_weather: Optional[Dict] = None
    feature_vectors: Optional[Dict[str, List[float]]] = None
