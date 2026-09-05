"""
Forecast API Endpoint
---------------------
POST /forecast: Multi-asset probabilistic quantile forecasts {P10, P50, P90}.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.forecast import ForecastSchema, ForecastRequest
from app.services.forecasting import forecasting_service

router = APIRouter()


@router.post("/forecast", response_model=ForecastSchema)
async def post_forecast(req: ForecastRequest = ForecastRequest()):
    try:
        res = await forecasting_service.predict(feature_vectors=req.feature_vectors)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
