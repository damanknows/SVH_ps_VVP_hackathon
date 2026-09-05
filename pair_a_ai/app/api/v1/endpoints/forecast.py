from fastapi import APIRouter, Request, Depends
from app.schemas.forecast import ForecastSchema, ForecastRequest
from app.services.forecasting import ForecastingService

router = APIRouter()


def get_forecasting_service(request: Request) -> ForecastingService:
    return request.app.state.forecasting_service


@router.post("/forecast", response_model=ForecastSchema, summary="Compute 15-minute 96-step quantile forecasts")
async def generate_forecast(
    body: ForecastRequest,
    service: ForecastingService = Depends(get_forecasting_service)
):
    return await service.predict(body.feature_vectors)
