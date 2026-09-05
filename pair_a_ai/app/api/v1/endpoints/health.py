from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", summary="Health check endpoint")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "horizon_steps": settings.HORIZON_STEPS,
        "resolution_minutes": settings.RESOLUTION_MINUTES,
        "assets": list(settings.ASSETS.keys())
    }
