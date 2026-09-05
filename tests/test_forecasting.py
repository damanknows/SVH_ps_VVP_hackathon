"""
Unit Tests for Probabilistic ONNX Forecast Engine
-------------------------------------------------
Validates ONNX session loading, batched inference, P10/P50/P90 quantile monotonicity,
solar night invariant, and non-negativity.
"""

import pytest
import numpy as np
from forecasting import ForecastEngine


@pytest.fixture(scope="module")
def engine():
    return ForecastEngine()


def test_forecast_engine_initialization(engine):
    assert engine is not None
    assert "solar" in engine.sessions
    assert "wind" in engine.sessions
    assert "load" in engine.sessions
    assert engine.rmse["solar"] > 0.0
    assert engine.rmse["wind"] > 0.0
    assert engine.rmse["load"] > 0.0


def test_forecast_solar_quantiles_and_night_invariant(engine):
    # Construct 24 synthetic rows: 12 night hours (0 radiation), 12 day hours (high radiation)
    np.random.seed(42)
    night_feats = np.zeros((12, len(engine.features["solar"])), dtype=np.float32)
    # Set hour to midnight (0) and temp to 25
    night_feats[:, 0] = 0.0  # hour_of_day
    night_feats[:, 3] = 25.0 # temp_c

    res_night = engine.run(night_feats, "solar")
    assert np.all(np.array(res_night["p10"]) == 0.0)
    assert np.all(np.array(res_night["p50"]) == 0.0)
    assert np.all(np.array(res_night["p90"]) == 0.0)

    # Day features with high radiation
    day_feats = np.zeros((12, len(engine.features["solar"])), dtype=np.float32)
    day_feats[:, 0] = 12.0 # hour_of_day
    day_feats[:, 1] = 170.0 # day_of_year
    day_feats[:, 2] = 5.0  # cloud_pct
    day_feats[:, 3] = 38.0 # temp_c
    day_feats[:, 4] = 900.0 # shortwave_radiation
    day_feats[:, 5] = 800.0 # direct_normal_irradiance
    day_feats[:, 6] = 100.0 # diffuse_radiation

    res_day = engine.run(day_feats, "solar")
    p10 = np.array(res_day["p10"])
    p50 = np.array(res_day["p50"])
    p90 = np.array(res_day["p90"])

    assert np.all(p10 >= 0.0)
    assert np.all(p50 > 50.0)
    # Monotonicity: P10 <= P50 <= P90
    assert np.all(p10 <= p50)
    assert np.all(p50 <= p90)
    assert np.all(p90 <= 200.0) # Inverter AC rating cap


def test_forecast_wind_quantiles(engine):
    np.random.seed(42)
    wind_feats = np.zeros((24, len(engine.features["wind"])), dtype=np.float32)
    wind_feats[:, 0] = 7.5   # wind_speed
    wind_feats[:, 1] = 10.0  # wind_speed_100m
    wind_feats[:, 2] = 12.0  # wind_gust
    wind_feats[:, 3] = 1005.0# surface_pressure
    wind_feats[:, 4] = 30.0  # temp_c

    res = engine.run(wind_feats, "wind")
    p10 = np.array(res["p10"])
    p50 = np.array(res["p50"])
    p90 = np.array(res["p90"])

    assert len(p10) == 24
    assert np.all(p10 >= 0.0)
    assert np.all(p10 <= p50)
    assert np.all(p50 <= p90)
    assert np.all(p90 <= 50.0) # Turbine rating cap


def test_forecast_load_quantiles(engine):
    np.random.seed(42)
    load_feats = np.zeros((24, len(engine.features["demand"])), dtype=np.float32)
    load_feats[:, 0] = np.arange(24) # hour_of_day
    load_feats[:, 1] = 2 # Wednesday
    load_feats[:, 2] = 1 # is_lab_hour
    load_feats[:, 3] = 0 # is_hostel_peak
    load_feats[:, 4] = 32.0 # temp_c

    res = engine.run(load_feats, "load")
    p10 = np.array(res["p10"])
    p50 = np.array(res["p50"])
    p90 = np.array(res["p90"])

    assert len(p50) == 24
    assert np.all(p10 >= 70.0) # Baseload clamp
    assert np.all(p10 <= p50)
    assert np.all(p50 <= p90)


def test_generate_probabilistic_forecast_structure(engine):
    fc = engine.generate_probabilistic_forecast()
    assert len(fc) == 24
    for pt in fc:
        assert "timestamp" in pt
        assert "solar" in pt and "p10" in pt["solar"] and "p50" in pt["solar"] and "p90" in pt["solar"]
        assert "wind" in pt and "p10" in pt["wind"] and "p50" in pt["wind"] and "p90" in pt["wind"]
        assert "demand" in pt and "p10" in pt["demand"] and "p50" in pt["demand"] and "p90" in pt["demand"]
        assert pt["solar"]["p10"] <= pt["solar"]["p50"] <= pt["solar"]["p90"]
        assert pt["wind"]["p10"] <= pt["wind"]["p50"] <= pt["wind"]["p90"]
        assert pt["demand"]["p10"] <= pt["demand"]["p50"] <= pt["demand"]["p90"]
