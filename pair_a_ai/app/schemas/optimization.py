"""
Optimization Pydantic Schemas
-----------------------------
Defines LP dispatch setpoints, SCADA ActionItems, and KPI summaries.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.schemas.forecast import ForecastSchema


class ActionItem(BaseModel):
    timestamp: str
    asset_id: str
    setpoint_kw: float
    mode: str  # "charge", "discharge", "grid_import", "grid_export", "idle"
    reason: str
    priority: str = "HIGH"  # "HIGH", "MEDIUM", "LOW"


class OptimizationOutputSchema(BaseModel):
    solved_at: str
    horizon_steps: int = 96
    status: str  # "optimal", "feasible", "emergency_fallback"
    actions: List[ActionItem]
    kpis: Dict[str, float]
    setpoints: Optional[Dict[str, List[float]]] = None
    quantile_robustness: Optional[Dict[str, Any]] = None


class CurrentStateSchema(BaseModel):
    bess_soc_pct: float = 65.0
    solar_kw: Optional[float] = 0.0
    wind_kw: Optional[float] = 0.0
    campus_load_kw: Optional[float] = 120.0


class OptimizationRequest(BaseModel):
    current_state: CurrentStateSchema = Field(default_factory=CurrentStateSchema)
    forecast: Optional[ForecastSchema] = None
