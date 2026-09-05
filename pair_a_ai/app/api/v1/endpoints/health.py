"""
Health API Endpoint
-------------------
"""

from fastapi import APIRouter
from app.services.forecasting import forecasting_service

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "pair_a_ai",
        "onnx_ready": forecasting_service.onnx_ready,
        "solver": "HiGHS (appsi_highs)",
    }
