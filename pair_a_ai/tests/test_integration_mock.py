"""
Integration Tests for Pair A FastAPI Service
--------------------------------------------
Executes end-to-end integration requests against FastAPI endpoints.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

TEST_DIR = Path(__file__).resolve().parent
PAIR_A_DIR = TEST_DIR.parent
if str(PAIR_A_DIR) not in sys.path:
    sys.path.insert(0, str(PAIR_A_DIR))

from app.main import app
from app.schemas.forecast import ForecastSchema
from app.schemas.optimization import OptimizationOutputSchema


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["horizon_minutes"] == 1440
    assert data["resolution_minutes"] == 15


def test_health_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert len(data["assets"]) == 5


def test_forecast_endpoint(client):
    payload = {"feature_vectors": {}}
    res = client.post("/api/v1/forecast", json=payload)
    assert res.status_code == 200
    schema = ForecastSchema(**res.json())
    assert schema.horizon_minutes == 1440
    assert schema.resolution_minutes == 15
    assert len(schema.forecasts) == 4
    for asset_id in ["solar-pv-block-a", "wind-turb-1", "load-academic", "load-hostel"]:
        assert asset_id in schema.forecasts
        assert len(schema.forecasts[asset_id].p50_kw) == 96


def test_optimize_endpoint(client):
    payload = {
        "current_state": {
            "bess_soc_pct": 75.0,
            "campus_load_kw": 180.0
        }
    }
    res = client.post("/api/v1/optimize", json=payload)
    assert res.status_code == 200
    output = OptimizationOutputSchema(**res.json())
    assert output.status == "optimal"
    assert output.horizon_steps == 96
    assert len(output.actions) > 0
    assert "total_cost_inr" in output.kpis
    assert output.kpis["solve_time_ms"] < 200.0
