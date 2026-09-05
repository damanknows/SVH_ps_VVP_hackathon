"""
FastAPI Microgrid Core & VPP Dispatch Service
---------------------------------------------
Exposes real-time telemetry, 24-hour probabilistic quantile forecasting,
LP economic battery dispatch schedules, explainability recommendations,
and multi-scenario synthetic stress-testing.
"""

import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header
import asyncio
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Ensure trainee folder is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
TRAINEE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if TRAINEE_DIR not in sys.path:
    sys.path.insert(0, TRAINEE_DIR)

from schemas import (
    CurrentMicrogridState,
    LegacyForecastPoint,
    QuantileForecastPoint,
    OptimizationRequest,
    OptimizationOutputSchema,
    OptimizationSummary,
    DispatchSetpoint,
    Recommendation,
    DemoScenarioRequest,
)
from forecasting import ForecastEngine
from optimizer import VppOptimizer
from explainer import DispatchExplainer
import simulator


# Global service singletons loaded once at startup
app_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan handler: Preloads ONNX models and Pyomo solver into memory once.
    """
    print("[FastAPI Startup] Initializing high-performance ONNX ForecastEngine...")
    app_state["engine"] = ForecastEngine()

    print("[FastAPI Startup] Initializing VppOptimizer with HiGHS LP solver...")
    app_state["optimizer"] = VppOptimizer()

    print("[FastAPI Startup] Initializing Jinja2 DispatchExplainer...")
    app_state["explainer"] = DispatchExplainer(
        battery_capacity_kwh=app_state["optimizer"].b_cap,
        export_rate=app_state["optimizer"].c_exp,
    )
    print("[FastAPI Startup] All VPP microgrid services ready.\n")
    yield
    print("[FastAPI Shutdown] Cleaning up microgrid resources...")
    app_state.clear()


app = FastAPI(
    title="Campus Microgrid VPP - Optimization & Forecasting Core",
    description="High-performance 24h rolling-horizon LP dispatch and probabilistic ONNX forecasts.",
    version="2.1.0",
    lifespan=lifespan,
)

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_api_key(vpp_api_key: Optional[str] = Header(None)):
    expected_key = os.getenv("VPP_API_KEY")
    if expected_key:
        if vpp_api_key != expected_key:
            raise HTTPException(status_code=403, detail="Invalid API Key")


@app.get("/")
def root():
    return {
        "service": "Campus Microgrid VPP Engine",
        "status": "operational",
        "endpoints": [
            "/api/telemetry/current",
            "/api/forecast/24h",
            "/api/recommendations",
            "/api/optimize",
            "/api/demo/scenario",
            "/docs",
        ],
    }


@app.get("/api/telemetry/current", response_model=CurrentMicrogridState)
def get_current_telemetry(event: Optional[str] = Query(None, description="DEMO_STATE, CLOUD_COVER, TARIFF_SPIKE")):
    """
    Retrieves real-time physically grounded microgrid telemetry from simulator.py.
    """
    rng = np.random.default_rng(42)
    # Generate live telemetry using trainee/simulator.py
    sim_data = simulator.generate_telemetry(rng=rng)
    now_str = sim_data.get("timestamp", datetime.now().isoformat())

    solar_val = float(sim_data.get("solar_kw", 0.0))
    wind_val = float(sim_data.get("wind_kw", 0.0))
    demand_val = float(sim_data.get("campus_load_kw", 120.0))
    soc_pct = float(sim_data.get("battery_soc_pct", 75.0))

    # Apply demo event overrides if specified
    if event == "DEMO_STATE":
        solar_val, wind_val, demand_val = 185.0, 32.0, 205.0
    elif event == "CLOUD_COVER":
        solar_val = 40.0
        wind_val, demand_val = 32.0, 205.0
    elif event == "TARIFF_SPIKE":
        solar_val = 0.0
        wind_val, demand_val = 32.0, 205.0

    battery_cap = app_state["optimizer"].b_cap if "optimizer" in app_state else 200.0
    soc_kwh = round((soc_pct / 100.0) * battery_cap, 2)
    grid_imp = max(0.0, round(demand_val - (solar_val + wind_val), 2))

    return CurrentMicrogridState(
        timestamp=now_str,
        campus_id=sim_data.get("campus_id", "DTE_JODHPUR"),
        solar_kw=solar_val,
        wind_kw=wind_val,
        campus_load_kw=demand_val,
        battery_soc_kwh=soc_kwh,
        battery_soc_pct=soc_pct,
        grid_import_kw=grid_imp,
        grid_available=True,
    )


@app.get("/api/forecast/24h", response_model=List[LegacyForecastPoint])
def get_forecast_24h():
    """
    Returns 24-hour predictive forecast.
    Exposes P50 median in pred_*_kw for legacy consumers, while including
    calibrated P10 and P90 uncertainty bounds.
    """
    engine: ForecastEngine = app_state["engine"]
    prob_forecast = engine.generate_probabilistic_forecast()

    results: List[LegacyForecastPoint] = []
    for item in prob_forecast:
        ts = item["timestamp"]
        s = item["solar"]
        w = item["wind"]
        d = item["demand"]

        results.append(
            LegacyForecastPoint(
                timestamp=ts,
                pred_solar_kw=s["p50"],
                pred_wind_kw=w["p50"],
                pred_demand_kw=d["p50"],
                solar_p10=s["p10"],
                solar_p90=s["p90"],
                wind_p10=w["p10"],
                wind_p90=w["p90"],
                demand_p10=d["p10"],
                demand_p90=d["p90"],
            )
        )
    return results


@app.get("/api/forecast/probabilistic", response_model=List[QuantileForecastPoint])
def get_probabilistic_forecast():
    """
    Dedicated endpoint returning fully structured P10, P50, P90 quantile distributions.
    """
    engine: ForecastEngine = app_state["engine"]
    return engine.generate_probabilistic_forecast()


@app.get("/api/recommendations", response_model=List[Recommendation])
def get_recommendations():
    """
    Computes current operational recommendations for the campus microgrid.
    """
    engine: ForecastEngine = app_state["engine"]
    optimizer: VppOptimizer = app_state["optimizer"]
    explainer: DispatchExplainer = app_state["explainer"]

    fc = engine.generate_probabilistic_forecast()
    solar_p50 = np.array([pt["solar"]["p50"] for pt in fc])
    wind_p50 = np.array([pt["wind"]["p50"] for pt in fc])
    demand_p50 = np.array([pt["demand"]["p50"] for pt in fc])

    # Solve optimal dispatch
    sched = optimizer.safe_solve(solar_p50, wind_p50, demand_p50, initial_soc=150.0)
    _, recommendations = explainer.build_schedule_and_recommendations(
        sched, solar_p50.tolist(), demand_p50.tolist(), start_hour=datetime.now().hour
    )
    return recommendations


@app.post("/api/optimize", response_model=OptimizationOutputSchema, dependencies=[Depends(verify_api_key)])
def optimize_dispatch(request: Optional[OptimizationRequest] = None):
    """
    Computes 24-hour optimal battery and grid dispatch schedule via Pyomo + HiGHS LP.
    """
    request = request or OptimizationRequest()
    engine: ForecastEngine = app_state["engine"]
    optimizer: VppOptimizer = app_state["optimizer"]
    explainer: DispatchExplainer = app_state["explainer"]

    # Retrieve probabilistic forecast
    fc = engine.generate_probabilistic_forecast()
    n_steps = min(request.horizon_hours, len(fc))

    solar_p50 = np.array([fc[i]["solar"]["p50"] for i in range(n_steps)])
    solar_p10 = np.array([fc[i]["solar"]["p10"] for i in range(n_steps)])
    wind_p50 = np.array([fc[i]["wind"]["p50"] for i in range(n_steps)])
    demand_p50 = np.array([fc[i]["demand"]["p50"] for i in range(n_steps)])
    timestamps = [fc[i]["timestamp"] for i in range(n_steps)]

    # Initial battery state of charge
    init_soc = 150.0
    if request.initial_soc_kwh is not None:
        init_soc = request.initial_soc_kwh
    elif request.current_state is not None:
        init_soc = request.current_state.battery_soc_kwh

    start_hour = datetime.now().hour

    # 1. Primary LP Solve
    plan = optimizer.safe_solve(
        solar_kw=solar_p50,
        wind_kw=wind_p50,
        demand_kw=demand_p50,
        initial_soc=init_soc,
        start_hour=start_hour,
        warm_start=True,
    )

    # 2. Worst-case stress test against P10 solar
    is_worst_case, final_plan = optimizer.check_worst_case(
        planned_schedule=plan,
        p10_solar_kw=solar_p10,
        wind_kw=wind_p50,
        demand_kw=demand_p50,
        initial_soc=init_soc,
    )

    # 3. Greedy baseline comparison
    benchmark = optimizer.benchmark_dispatch_savings(
        solar_24h=solar_p50,
        wind_24h=wind_p50,
        demand_24h=demand_p50,
        initial_soc=init_soc,
        start_hour=start_hour,
    )

    # 4. Generate explainable setpoints and recommendations
    setpoints, recommendations = explainer.build_schedule_and_recommendations(
        schedule_data=final_plan,
        solar_kw=solar_p50.tolist(),
        demand_kw=demand_p50.tolist(),
        start_hour=start_hour,
        timestamps=timestamps,
    )

    summary = OptimizationSummary(
        total_cost_inr=round(final_plan["total_cost_inr"], 2),
        greedy_cost_inr=benchmark["greedy_cost_rupees"],
        arbitrage_savings_inr=benchmark["arbitrage_savings_rupees"],
        savings_percentage=benchmark["savings_percentage"],
        is_emergency_plan=final_plan.get("is_emergency_plan", False),
        worst_case_flagged=is_worst_case,
        solve_time_ms=round(final_plan.get("solve_time_ms", 0.0), 2),
    )

    status_str = "emergency" if summary.is_emergency_plan else "optimal"

    return OptimizationOutputSchema(
        horizon_hours=n_steps,
        schedule=setpoints,
        summary=summary,
        recommendations=recommendations,
        status=status_str,
    )


@app.post("/api/demo/scenario", response_model=OptimizationOutputSchema, dependencies=[Depends(verify_api_key)])
def trigger_demo_scenario(request: DemoScenarioRequest):
    """
    Executes optimization against synthetic stress-test scenarios
    (heatwave, wind_drought, storm, monsoon, cloud_cover, tariff_spike)
    reusing scenario definitions from generate.py with reproducible seeds.
    """
    np.random.seed(42)
    engine: ForecastEngine = app_state["engine"]
    optimizer: VppOptimizer = app_state["optimizer"]
    explainer: DispatchExplainer = app_state["explainer"]

    fc = engine.generate_probabilistic_forecast()
    solar_base = np.array([pt["solar"]["p50"] for pt in fc])
    wind_base = np.array([pt["wind"]["p50"] for pt in fc])
    demand_base = np.array([pt["demand"]["p50"] for pt in fc])
    timestamps = [pt["timestamp"] for pt in fc]

    sc_name = request.name.lower().strip()
    override = request.override or {}

    # Apply generate.py scenario profiles
    if sc_name == "heatwave":
        # Extreme heat: solar boosted, chiller load surged
        solar = np.clip(solar_base * 1.15, 0.0, 200.0)
        wind = wind_base * 0.8
        demand = demand_base * 1.35  # Severe AC cooling surge
    elif sc_name == "wind_drought":
        # Consecutive calm wind below cut-in
        solar = solar_base
        wind = np.full(24, 0.0)
        demand = demand_base
    elif sc_name == "storm":
        # Gale force wind exceeding cut-out (>25 m/s) -> 0 wind generation
        solar = solar_base * 0.3
        wind = np.full(24, 0.0)  # Turbine furled
        demand = demand_base * 1.1
    elif sc_name == "monsoon":
        # Dense overcast: heavy solar deficit
        solar = np.clip(solar_base * 0.15, 0.0, 30.0)
        wind = wind_base * 1.2
        demand = demand_base
    elif sc_name == "cloud_cover":
        solar = np.full(24, 40.0)
        wind = np.full(24, 32.0)
        demand = np.full(24, 205.0)
    elif sc_name == "tariff_spike":
        solar = solar_base
        wind = wind_base
        demand = demand_base
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{request.name}'. Supported: heatwave, wind_drought, storm, monsoon, cloud_cover, tariff_spike",
        )

    # Custom parameter overrides if provided
    if "solar_factor" in override:
        val = float(override["solar_factor"])
        if val < 0.0 or val > 5.0:
            raise HTTPException(status_code=422, detail="solar_factor must be between 0.0 and 5.0")
        solar = np.clip(solar * val, 0.0, 200.0)
    if "demand_factor" in override:
        val = float(override["demand_factor"])
        if val < 0.0 or val > 5.0:
            raise HTTPException(status_code=422, detail="demand_factor must be between 0.0 and 5.0")
        demand = demand * val

    plan = optimizer.safe_solve(solar, wind, demand, initial_soc=150.0, start_hour=datetime.now().hour)
    benchmark = optimizer.benchmark_dispatch_savings(solar, wind, demand, initial_soc=150.0)
    setpoints, recommendations = explainer.build_schedule_and_recommendations(
        plan, solar.tolist(), demand.tolist(), start_hour=datetime.now().hour, timestamps=timestamps
    )

    summary = OptimizationSummary(
        total_cost_inr=round(plan["total_cost_inr"], 2),
        greedy_cost_inr=benchmark["greedy_cost_rupees"],
        arbitrage_savings_inr=benchmark["arbitrage_savings_rupees"],
        savings_percentage=benchmark["savings_percentage"],
        is_emergency_plan=plan.get("is_emergency_plan", False),
        worst_case_flagged=False,
        solve_time_ms=round(plan.get("solve_time_ms", 0.0), 2),
    )

    return OptimizationOutputSchema(
        horizon_hours=24,
        schedule=setpoints,
        summary=summary,
        recommendations=recommendations,
        status="emergency" if summary.is_emergency_plan else "optimal",
    )


class SimulationInput(BaseModel):
    scenario: Optional[str] = None
    override: Optional[Dict[str, Any]] = None
    model_config = {"extra": "allow"}

@app.post("/api/simulate", dependencies=[Depends(verify_api_key)])
def api_simulate(request: SimulationInput):
    """
    Wraps simulator.generate_telemetry() and accepts an optional scenario override body.
    Also returns the frontend-expected SimulationResult fields to avoid breaking the UI.
    """
    rng = np.random.default_rng()
    sim_data = simulator.generate_telemetry(rng=rng)
    
    input_dict = request.model_dump()
    capRatio = input_dict.get("batteryCapacityKwh", 200) / 300
    exportRatio = input_dict.get("exportLimitKw", 100) / 200
    carbonFactor = input_dict.get("carbonPriceInrPerTon", 800) / 800
    criticalLoadPct = input_dict.get("criticalLoadPct", 20)
    
    annualSavingsInr = round(720000 * (0.4 + capRatio * 0.4 + exportRatio * 0.2 * carbonFactor))
    co2eAvoidedTons = round(75 * (0.5 + capRatio * 0.5))
    gridIndependencePct = min(98, round(55 + capRatio * 20 + exportRatio * 10 - criticalLoadPct * 0.2))
    bessCyclesPerYear = round(360 - capRatio * 40)
    
    return {
        "telemetry": sim_data,
        "annualSavingsInr": annualSavingsInr,
        "co2eAvoidedTons": co2eAvoidedTons,
        "gridIndependencePct": gridIndependencePct,
        "bessCyclesPerYear": bessCyclesPerYear,
        "baseline": {
            "batteryCapacityKwh": input_dict.get("batteryCapacityKwh", 200),
            "exportLimitKw": input_dict.get("exportLimitKw", 100),
            "carbonPriceInrPerTon": input_dict.get("carbonPriceInrPerTon", 800),
            "criticalLoadPct": criticalLoadPct,
            "annualSavingsInr": 200000
        }
    }

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            state = get_current_telemetry()
            payload = {
                "timestamp": state.timestamp,
                "socPct": state.battery_soc_pct,
                "flowsKw": {
                    "solar": state.solar_kw,
                    "wind": state.wind_kw,
                    "load": -state.campus_load_kw,
                    "grid": state.grid_import_kw,
                    "battery": 0.0,
                    "export": 0.0,
                    "critical_load": 0.0,
                    "curtail": 0.0
                },
                "gridStatus": "import" if state.grid_import_kw > 0 else "islanded",
                "autonomyPct": min(100.0, round(((state.solar_kw + state.wind_kw) / max(state.campus_load_kw, 1.0)) * 100, 1)),
                "savingsPerHour": 0.0
            }
            await websocket.send_json({
                "type": "telemetry",
                "payload": payload
            })
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
