"""
Pair A FastAPI Application
--------------------------
Serves 15-minute 96-step quantile forecasting and optimal LP dispatch setpoints.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.services.forecasting import ForecastingService
from app.services.optimizer import VppOptimizer


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load ONNX sessions and initialize optimizer
    print(f"[Pair A Startup] Loading ONNX quantile models from {settings.MODEL_DIR}...")
    app.state.forecasting_service = ForecastingService()
    print("[Pair A Startup] Initializing Pyomo HiGHS VppOptimizer...")
    app.state.optimizer = VppOptimizer()
    print("[Pair A Startup] All Pair A services initialized successfully.\n")
    yield
    print("[Pair A Shutdown] Cleaning up services...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multi-asset 15-minute resolution quantile forecasting and Pyomo/HiGHS LP dispatch optimizer.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "horizon_minutes": settings.HORIZON_MINUTES,
        "resolution_minutes": settings.RESOLUTION_MINUTES,
        "endpoints": [
            f"{settings.API_V1_STR}/health",
            f"{settings.API_V1_STR}/forecast",
            f"{settings.API_V1_STR}/optimize",
            "/docs",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
