"""
Optimization Schemas for Pair A
-------------------------------
Defines Pydantic models for 15-minute 96-step dispatch actions, setpoints, and KPIs.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from .forecast import ForecastSchema


class ActionItem(BaseModel):
    timestamp: str
    asset_id: str
    setpoint_kw: float = Field(..., description="Active power setpoint (kW, signed or unsigned)")
    mode: str = Field(..., description="Operating mode: charge, discharge, grid_import, grid_export, idle")
    reason: str = Field(..., description="Operator rationale rendered from Jinja2 template")
    priority: str = Field(default="HIGH", description="Action execution priority: HIGH, MEDIUM, LOW")


class OptimizationOutputSchema(BaseModel):
    solved_at: str
    horizon_steps: int = 96
    status: str = Field(default="optimal", description="Solver status: optimal, feasible, emergency, fallback")
    actions: List[ActionItem]
    kpis: Dict[str, float] = Field(default_factory=dict, description="Summary KPIs: total_cost, grid_import_kwh, etc.")


class OptimizationRequest(BaseModel):
    current_state: Dict[str, Any] = Field(
        ...,
        description="Current microgrid telemetry: bess_soc_pct, current_load_kw, etc."
    )
    forecast: Optional[ForecastSchema] = Field(
        None,
        description="Optional pre-computed forecast schema; if omitted, forecasting service generates it"
    )
