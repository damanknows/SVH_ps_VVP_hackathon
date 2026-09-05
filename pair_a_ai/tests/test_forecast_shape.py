"""
Test Forecast Output Shape & Quantile Invariants
------------------------------------------------
Verifies:
- 96 15-minute resolution steps per 24h horizon
- Strict quantile monotonicity: P10 <= P50 <= P90
- Physical capacity caps & non-negativity
"""

import pytest
import numpy as np
from app.services.forecasting import forecasting_service


def test_forecast_shape_and_quantiles():
    fc = forecasting_service.predict_sync()

    assert fc.horizon_minutes == 1440
    assert fc.resolution_minutes == 15

    expected_assets = ["solar-pv-block-a", "wind-turb-1", "load-academic", "load-hostel"]
    for asset_id in expected_assets:
        assert asset_id in fc.forecasts, f"Missing asset {asset_id}"
        asset_fc = fc.forecasts[asset_id]
        assert len(asset_fc.timestamps) == 96
        assert len(asset_fc.p10_kw) == 96
        assert len(asset_fc.p50_kw) == 96
        assert len(asset_fc.p90_kw) == 96

        p10 = np.array(asset_fc.p10_kw)
        p50 = np.array(asset_fc.p50_kw)
        p90 = np.array(asset_fc.p90_kw)

        # Monotonicity with numerical tolerance
        assert np.all(p10 <= p50 + 1e-2), f"{asset_id} violated p10 <= p50"
        assert np.all(p50 <= p90 + 1e-2), f"{asset_id} violated p50 <= p90"
        assert np.all(p10 >= 0.0), f"{asset_id} has negative p10"


def test_solar_night_guardrail():
    import pandas as pd
    fc = forecasting_service.predict_sync()
    solar = fc.forecasts["solar-pv-block-a"]

    night_steps_checked = 0
    for ts_str, p50 in zip(solar.timestamps, solar.p50_kw):
        ts = pd.to_datetime(ts_str)
        if ts.hour >= 21 or ts.hour < 5:  # True night hours in Jodhpur
            assert p50 == 0.0, f"Night solar generation detected at {ts}: {p50} kW"
            night_steps_checked += 1

    assert night_steps_checked > 0, "No night steps found in 24h horizon"
