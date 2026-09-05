"""
Core Application Configuration
------------------------------
Defines microgrid asset specifications, battery boundaries,
tariffs, model paths, and mathematical programming solver parameters.
"""

import os
from pathlib import Path
from typing import Dict, Any
from pydantic_settings import BaseSettings

APP_DIR = Path(__file__).resolve().parent.parent
PAIR_A_DIR = APP_DIR.parent
DEFAULT_MODEL_DIR = PAIR_A_DIR / "models"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Pair A Microgrid AI Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    MODEL_DIR: Path = DEFAULT_MODEL_DIR

    # Horizon & Resolution
    HORIZON_MINUTES: int = 1440
    RESOLUTION_MINUTES: int = 15
    HORIZON_STEPS: int = 96
    DT_HOURS: float = 0.25

    # Asset specifications matching pair_a_ai specifications
    ASSETS: Dict[str, Any] = {
        "solar-pv-block-a": {
            "capacity_kw": 250.0,
            "technology": "Silicon PV"
        },
        "wind-turb-1": {
            "capacity_kw": 50.0,
            "technology": "Horizontal Axis Turbine"
        },
        "load-academic": {
            "capacity_kw": 160.0
        },
        "load-hostel": {
            "capacity_kw": 110.0
        },
        "bess-main": {
            "capacity_kwh": 200.0,
            "max_charge_kw": 50.0,
            "max_discharge_kw": 50.0,
            "efficiency": 0.95,
            "min_soc_pct": 20.0,
            "reserve_soc_pct": 20.0,
            "max_soc_pct": 90.0,
            "degradation_cost_inr_kwh": 0.50
        }
    }

    # Tariffs
    TARIFF: Dict[str, float] = {
        "off_peak_inr_kwh": 6.42,
        "normal_inr_kwh": 7.55,
        "peak_inr_kwh": 8.68,
        "export_rate_inr_kwh": 3.50
    }

    # Solver
    SOLVER_NAME: str = "highs"
    SOLVER_OPTIONS: Dict[str, Any] = {
        "parallel": "on",
        "time_limit": 10.0,
        "presolve": "on"
    }

    model_config = {"case_sensitive": True}


settings = Settings()
