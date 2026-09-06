"""
Optimization Pydantic Schemas
-----------------------------
Defines frozen contracts for the VPP microgrid dispatch optimizer,
setpoint schedules, explainability summaries, and scenario controls.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .state_schema import CurrentMicrogridState


class Recommendation(BaseModel):
    action: str = Field(..., description="Action recommendation (e.g. CHARGE, DISCHARGE, HOLD)")
    reason: str = Field(..., description="Contextual explanation for microgrid operator")
    est_savings_rupees: float = Field(..., description="Estimated cost savings in INR")
    est_co2_kg: float = Field(..., description="Estimated CO2 avoided in kg")


class DispatchSetpoint(BaseModel):
    hour: int = Field(..., ge=0, le=24, description="Horizon timestep index (0 to N-1)")
    timestamp: Optional[str] = Field(None, description="ISO-8601 timestep timestamp")
    p_battery_charge_kw: float = Field(..., ge=0.0, description="Battery charging setpoint (kW)")
    p_battery_discharge_kw: float = Field(..., ge=0.0, description="Battery discharging setpoint (kW)")
    p_grid_import_kw: float = Field(..., ge=0.0, description="Grid import power (kW)")
    p_grid_export_kw: float = Field(..., ge=0.0, description="Grid export power (kW)")
    battery_soc_kwh: float = Field(..., ge=0.0, description="Projected battery energy content (kWh)")
    battery_soc_pct: float = Field(..., ge=0.0, le=100.0, description="Projected battery state of charge (%)")
    action: str = Field(..., description="Primary dispatch action (CHARGE, DISCHARGE, IDLE, IMPORT, EXPORT)")
    reason: str = Field(..., description="Human-readable decision explanation")


class OptimizationSummary(BaseModel):
    total_cost_inr: float = Field(..., description="Total cost under optimal LP dispatch (INR)")
    greedy_cost_inr: float = Field(..., description="Benchmark cost under unmanaged greedy dispatch (INR)")
    arbitrage_savings_inr: float = Field(..., description="Net financial savings achieved by optimizer (INR)")
    savings_percentage: float = Field(..., description="Percentage financial improvement over baseline (%)")
    is_emergency_plan: bool = Field(default=False, description="Flag indicating emergency reserve margin relaxation was invoked")
    worst_case_flagged: bool = Field(default=False, description="Flag indicating P10 worst-case solar stress required safety adjustments")
    solve_time_ms: float = Field(default=0.0, description="Total solver execution wall-clock time in milliseconds")


class OptimizationRequest(BaseModel):
    current_state: Optional[CurrentMicrogridState] = None
    horizon_hours: int = Field(default=24, ge=1, le=48, description="Optimization lookahead horizon in hours")
    initial_soc_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0, description="Starting battery storage in kWh (defaults to 150.0 kWh)")
    scenario_override: Optional[str] = Field(None, description="Demo scenario name (e.g. heatwave, wind_drought, storm, monsoon)")


class OptimizationOutputSchema(BaseModel):
    horizon_hours: int
    schedule: List[DispatchSetpoint]
    summary: OptimizationSummary
    recommendations: List[Recommendation]
    status: str = Field(default="optimal", description="Termination status (optimal, emergency, infeasible)")


class DemoScenarioRequest(BaseModel):
    name: str = Field(..., description="Scenario name: heatwave, wind_drought, storm, monsoon, cloud_cover, tariff_spike")
    override: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom parameter overrides")
