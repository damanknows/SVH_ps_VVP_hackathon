"""
Pair A Core Configuration & Microgrid Asset Specification
---------------------------------------------------------
"""

from pathlib import Path
from typing import Dict, Any
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "Pair A AI - VVP Microgrid EMS"
    API_V1_STR: str = "/api/v1"
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    MODEL_DIR: Path = Path(__file__).resolve().parent.parent.parent / "models"
    SOLVER_NAME: str = "appsi_highs"

    DEFAULT_CONFIG: Dict[str, Any] = {
        "assets": {
            "bess-main": {
                "capacity_kwh": 500.0,
                "max_charge_kw": 100.0,
                "max_discharge_kw": 100.0,
                "efficiency": 0.95,
                "min_soc_pct": 15.0,
                "reserve_soc_pct": 20.0,
            },
            "solar-pv-block-a": {"capacity_kw": 200.0},
            "wind-turb-1": {"capacity_kw": 50.0},
            "load-academic": {"capacity_kw": 150.0},
            "load-hostel": {"capacity_kw": 120.0},
        },
        "tariff": {
            "peak_rate_inr_kwh": 11.50,
            "normal_rate_inr_kwh": 7.50,
            "offpeak_rate_inr_kwh": 5.20,
            "export_rate_inr_kwh": 3.80,
        },
    }


settings = Settings()
