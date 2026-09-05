"""
End-to-End Integration & FastAPI Backend Test Suite
---------------------------------------------------
Verifies full pipeline integration (Simulator -> Forecast -> Optimizer -> Explainer -> Schema)
and executes API contract validation against FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
import numpy as np

from backend.main import app
from schemas import (
    CurrentMicrogridState,
    LegacyForecastPoint,
    QuantileForecastPoint,
    OptimizationOutputSchema,
    Recommendation,
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    payload = res.json()
    assert payload["status"] == "operational"
    assert "/api/optimize" in payload["endpoints"]


def test_current_telemetry_endpoint(client):
    res = client.get("/api/telemetry/current")
    assert res.status_code == 200
    data = res.json()
    # Pydantic schema validation
    state = CurrentMicrogridState(**data)
    assert state.solar_kw >= 0.0
    assert state.wind_kw >= 0.0
    assert state.campus_load_kw >= 70.0
    assert 0.0 <= state.battery_soc_pct <= 100.0


def test_telemetry_demo_query_triggers(client):
    res_demo = client.get("/api/telemetry/current?event=DEMO_STATE")
    assert res_demo.status_code == 200
    data = res_demo.json()
    assert data["solar_kw"] == 185.0
    assert data["wind_kw"] == 32.0
    assert data["campus_load_kw"] == 205.0

    res_cloud = client.get("/api/telemetry/current?event=CLOUD_COVER")
    assert res_cloud.status_code == 200
    assert res_cloud.json()["solar_kw"] == 40.0


def test_forecast_24h_endpoint(client):
    res = client.get("/api/forecast/24h")
    assert res.status_code == 200
    points = res.json()
    assert len(points) == 24
    for pt in points:
        point_obj = LegacyForecastPoint(**pt)
        assert point_obj.pred_solar_kw >= 0.0
        assert point_obj.pred_wind_kw >= 0.0
        assert point_obj.pred_demand_kw >= 70.0
        # Check that quantile envelope fields are present
        assert point_obj.solar_p10 is not None
        assert point_obj.solar_p90 is not None
        assert point_obj.solar_p10 <= point_obj.pred_solar_kw <= point_obj.solar_p90


def test_probabilistic_forecast_endpoint(client):
    res = client.get("/api/forecast/probabilistic")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 24
    for item in items:
        qp = QuantileForecastPoint(**item)
        assert qp.solar.p10 <= qp.solar.p50 <= qp.solar.p90
        assert qp.wind.p10 <= qp.wind.p50 <= qp.wind.p90
        assert qp.demand.p10 <= qp.demand.p50 <= qp.demand.p90


def test_recommendations_endpoint(client):
    res = client.get("/api/recommendations")
    assert res.status_code == 200
    recs = res.json()
    assert isinstance(recs, list)
    assert len(recs) > 0
    for r in recs:
        rec_obj = Recommendation(**r)
        assert rec_obj.action in ["DISCHARGE_PEAK", "ABSORB_SOLAR", "EXPORT_GRID", "HOLD"]
        assert len(rec_obj.reason) > 5


def test_optimize_endpoint(client):
    payload = {
        "horizon_hours": 24,
        "initial_soc_kwh": 150.0
    }
    res = client.post("/api/optimize", json=payload)
    assert res.status_code == 200
    out_json = res.json()

    # Strict Pydantic schema validation
    output = OptimizationOutputSchema(**out_json)
    assert output.horizon_hours == 24
    assert len(output.schedule) == 24
    assert output.summary.total_cost_inr > 0.0
    assert output.summary.solve_time_ms > 0.0
    assert output.status in ["optimal", "emergency"]


@pytest.mark.parametrize("scenario_name", ["heatwave", "wind_drought", "storm", "monsoon"])
def test_demo_scenario_endpoint(client, scenario_name):
    payload = {
        "name": scenario_name,
        "override": {"solar_factor": 1.0}
    }
    res = client.post("/api/demo/scenario", json=payload)
    assert res.status_code == 200
    output = OptimizationOutputSchema(**res.json())
    assert output.horizon_hours == 24
    assert len(output.schedule) == 24
    assert output.status in ["optimal", "emergency"]
