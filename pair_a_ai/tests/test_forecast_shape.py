"""
Unit Tests for Pair A Forecast Shapes and Quantiles
---------------------------------------------------
Verifies that multi-output ONNX models produce exact (1, 96, 3) shapes
and obey strict statistical and physical invariants (P10 <= P50 <= P90).
"""

import sys
import os
from pathlib import Path
import pytest
import numpy as np

# Add pair_a_ai directory to path
TEST_DIR = Path(__file__).resolve().parent
PAIR_A_DIR = TEST_DIR.parent
if str(PAIR_A_DIR) not in sys.path:
    sys.path.insert(0, str(PAIR_A_DIR))

from app.services.forecasting import ForecastingService
from app.core.config import settings


@pytest.fixture(scope="module")
def forecaster():
    return ForecastingService()


def test_forecasting_service_loads_all_assets(forecaster):
    expected_assets = ["solar-pv-block-a", "wind-turb-1", "load-academic", "load-hostel"]
    for asset in expected_assets:
        assert asset in forecaster.sessions, f"Missing session for {asset}"


def test_forecast_shape_and_monotonicity(forecaster):
    res = forecaster.predict_sync()
    assert res.horizon_minutes == 1440
    assert res.resolution_minutes == 15
    assert len(res.forecasts) == 4

    for asset_id, forecast in res.forecasts.items():
        assert len(forecast.timestamps) == 96
        assert len(forecast.p10_kw) == 96
        assert len(forecast.p50_kw) == 96
        assert len(forecast.p90_kw) == 96

        p10 = np.array(forecast.p10_kw)
        p50 = np.array(forecast.p50_kw)
        p90 = np.array(forecast.p90_kw)

        # Monotonicity
        assert np.all(p10 <= p50 + 1e-4), f"{asset_id} violated P10 <= P50"
        assert np.all(p50 <= p90 + 1e-4), f"{asset_id} violated P50 <= P90"

        # Non-negativity
        assert np.all(p10 >= 0.0)
        assert np.all(p50 >= 0.0)
        assert np.all(p90 >= 0.0)

        # Capacity clipping
        cap = forecaster.metadata["asset_capacity_kw"][asset_id]
        assert np.all(p90 <= cap + 1e-4), f"{asset_id} exceeded capacity {cap}"


def test_async_forecast_predict(forecaster):
    import asyncio
    res = asyncio.run(forecaster.predict())
    assert len(res.forecasts) == 4
    assert len(res.forecasts["solar-pv-block-a"].timestamps) == 96
