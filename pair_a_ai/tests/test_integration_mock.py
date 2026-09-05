"""
Test Pair A AI FastAPI Integration Endpoints
--------------------------------------------
Exercises POST /forecast, POST /optimize, GET /health, and POST /demo/scenario.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "pair_a_ai"


def test_forecast_endpoint():
    res = client.post("/forecast", json={"horizon_h": 24})
    assert res.status_code == 200
    data = res.json()
    assert data["horizon_minutes"] == 1440
    assert "solar-pv-block-a" in data["forecasts"]
    assert len(data["forecasts"]["solar-pv-block-a"]["p50_kw"]) == 96


def test_optimize_endpoint():
    res = client.post("/optimize", json={"current_state": {"bess_soc_pct": 60.0}})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["optimal", "feasible"]
    assert len(data["actions"]) > 0
    assert "total_cost_inr" in data["kpis"]


def test_demo_scenario_endpoint():
    res = client.post("/demo/scenario", json={"name": "cloud_cover"})
    assert res.status_code == 200
    data = res.json()
    assert data["scenario"] == "cloud_cover"
    assert "optimization" in data
