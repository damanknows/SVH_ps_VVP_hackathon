"""
Forecast Pydantic Schemas
-------------------------
Defines frozen contracts for probabilistic quantile forecasting and legacy endpoints.
"""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class QuantileBand(BaseModel):
    p10: float = Field(..., description="10th percentile (conservative/pessimistic prediction)")
    p50: float = Field(..., description="50th percentile (median prediction)")
    p90: float = Field(..., description="90th percentile (optimistic prediction)")


class QuantileForecastPoint(BaseModel):
    timestamp: str
    solar: QuantileBand
    wind: QuantileBand
    demand: QuantileBand


class LegacyForecastPoint(BaseModel):
    timestamp: str
    pred_solar_kw: float = Field(..., description="Median solar generation (kW)")
    pred_wind_kw: float = Field(..., description="Median wind generation (kW)")
    pred_demand_kw: float = Field(..., description="Median campus load demand (kW)")
    # Optional quantile extensions for backward-compatible consumption
    solar_p10: Optional[float] = None
    solar_p90: Optional[float] = None
    wind_p10: Optional[float] = None
    wind_p90: Optional[float] = None
    demand_p10: Optional[float] = None
    demand_p90: Optional[float] = None


class ForecastResponse(BaseModel):
    generated_at: str
    horizon_hours: int = 24
    forecasts: List[QuantileForecastPoint]
