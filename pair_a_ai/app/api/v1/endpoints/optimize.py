"""
Optimize API Endpoint
---------------------
POST /optimize: Formulates and solves 96-step Pyomo HiGHS LP dispatch model.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.optimization import OptimizationRequest, OptimizationOutputSchema
from app.services.optimizer import vpp_optimizer
from app.services.forecasting import forecasting_service

router = APIRouter()


@router.post("/optimize", response_model=OptimizationOutputSchema)
async def post_optimize(req: OptimizationRequest = OptimizationRequest()):
    try:
        # If no forecast passed, generate it automatically
        fc = req.forecast
        if fc is None:
            fc = forecasting_service.predict_sync()

        output = vpp_optimizer.solve(current_state=req.current_state.model_dump(), forecast=fc)
        return output
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
