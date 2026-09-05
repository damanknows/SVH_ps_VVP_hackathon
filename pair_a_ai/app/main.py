"""
Pair A AI Microgrid Optimization & Forecasting Engine
-----------------------------------------------------
FastAPI application exposing production endpoints:
- POST /api/v1/forecast & /forecast: 96-step Probabilistic Quantile Predictions
- POST /api/v1/optimize & /optimize: 96-step HiGHS LP Economic Dispatch & ActionItems
- GET /api/v1/health & /health: Service and model status
- POST /demo/scenario: Physical stress scenario triggers for hackathon live judging
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.api.v1.endpoints import forecast as forecast_router
from app.api.v1.endpoints import optimize as optimize_router
from app.api.v1.endpoints import health as health_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Pair A AI Microgrid Forecasting & Mathematical Optimization Service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 routers
app.include_router(health_router.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(forecast_router.router, prefix=settings.API_V1_STR, tags=["Forecast"])
app.include_router(optimize_router.router, prefix=settings.API_V1_STR, tags=["Optimization"])

# Also mount root convenience paths as requested in H0-H1 / H1-H3
app.include_router(health_router.router, tags=["Health"])
app.include_router(forecast_router.router, tags=["Forecast"])
app.include_router(optimize_router.router, tags=["Optimization"])


class ScenarioRequest(BaseModel):
    name: str = "cloud_cover"  # "cloud_cover", "heatwave", "wind_drought", "storm_cutout"
    override: dict = {}


@app.post("/demo/scenario", tags=["Demo"])
async def post_demo_scenario(req: ScenarioRequest):
    """
    POST /demo/scenario: Injects specific scenario overrides (e.g. cloud_cover, storm_cutout)
    to demonstrate live optimizer adaptation and quantile hedging for judges.
    """
    from app.services.forecasting import forecasting_service
    from app.services.optimizer import vpp_optimizer

    fc = forecasting_service.predict_sync()
    scenario_name = req.name.lower()

    if "cloud" in scenario_name or "monsoon" in scenario_name:
        # Simulate heavy cloud cover
        solar_asset = fc.forecasts["solar-pv-block-a"]
        solar_asset.p10_kw = [0.0] * 96
        solar_asset.p50_kw = [round(x * 0.15, 2) for x in solar_asset.p50_kw]
        solar_asset.p90_kw = [round(x * 0.30, 2) for x in solar_asset.p90_kw]
        desc = "Heavy Cloudburst: Solar irradiance reduced by 85%"
    elif "drought" in scenario_name:
        wind_asset = fc.forecasts["wind-turb-1"]
        wind_asset.p10_kw = [0.0] * 96
        wind_asset.p50_kw = [0.0] * 96
        wind_asset.p90_kw = [0.0] * 96
        desc = "Wind Drought: Sub-cut-in calm conditions, 0 kW wind"
    elif "storm" in scenario_name:
        wind_asset = fc.forecasts["wind-turb-1"]
        # Cutout between steps 56-72 (14h-18h)
        for t in range(56, 72):
            wind_asset.p10_kw[t] = 0.0
            wind_asset.p50_kw[t] = 0.0
            wind_asset.p90_kw[t] = 0.0
        desc = "Severe Gale Storm: High wind furling cutout active (14:00-18:00)"
    else:
        desc = f"Custom scenario: {req.name}"

    opt = vpp_optimizer.solve(current_state={"bess_soc_pct": 55.0}, forecast=fc)

    return {
        "scenario": req.name,
        "description": desc,
        "forecast": fc,
        "optimization": opt,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
