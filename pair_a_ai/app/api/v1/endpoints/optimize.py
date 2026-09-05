from fastapi import APIRouter, Request, Depends
from app.schemas.optimization import OptimizationOutputSchema, OptimizationRequest
from app.services.optimizer import VppOptimizer
from app.services.forecasting import ForecastingService

router = APIRouter()


def get_optimizer(request: Request) -> VppOptimizer:
    return request.app.state.optimizer


def get_forecasting_service(request: Request) -> ForecastingService:
    return request.app.state.forecasting_service


@router.post("/optimize", response_model=OptimizationOutputSchema, summary="Compute optimal 96-step dispatch schedule")
async def optimize_setpoints(
    body: OptimizationRequest,
    optimizer: VppOptimizer = Depends(get_optimizer),
    forecasting_service: ForecastingService = Depends(get_forecasting_service)
):
    forecast = body.forecast
    if forecast is None:
        # Generate on the fly using default features
        forecast = await forecasting_service.predict({})

    return optimizer.solve(current_state=body.current_state, forecast=forecast)
