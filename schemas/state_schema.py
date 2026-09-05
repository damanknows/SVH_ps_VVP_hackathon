"""
State Pydantic Schemas
----------------------
Defines frozen contracts for microgrid telemetry and state input.
"""

from typing import Optional
from pydantic import BaseModel, Field


class CurrentMicrogridState(BaseModel):
    timestamp: str = Field(..., description="Current ISO-8601 timestamp")
    campus_id: str = Field(default="DTE_JODHPUR", description="Microgrid campus identifier")
    solar_kw: float = Field(default=0.0, ge=0.0, description="Real-time measured solar generation (kW)")
    wind_kw: float = Field(default=0.0, ge=0.0, description="Real-time measured wind generation (kW)")
    campus_load_kw: float = Field(default=70.0, ge=0.0, description="Real-time campus electrical load (kW)")
    battery_soc_kwh: float = Field(default=150.0, ge=0.0, description="Battery energy content (kWh)")
    battery_soc_pct: float = Field(default=75.0, ge=0.0, le=100.0, description="Battery state of charge (%)")
    grid_import_kw: float = Field(default=0.0, ge=0.0, description="Current power imported from grid (kW)")
    grid_available: bool = Field(default=True, description="Utility grid connection availability")
