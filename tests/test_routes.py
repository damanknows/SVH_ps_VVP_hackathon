import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from backend.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "operational"

@pytest.mark.parametrize("event", ["DEMO_STATE", "CLOUD_COVER", "TARIFF_SPIKE"])
def test_get_telemetry_events(client, event):
    response = client.get(f"/api/telemetry/current?event={event}")
    assert response.status_code == 200
    data = response.json()
    assert "battery_soc_pct" in data
    assert "solar_kw" in data

    if event == "DEMO_STATE":
        assert data["solar_kw"] == 185.0
        assert data["wind_kw"] == 32.0
    elif event == "CLOUD_COVER":
        assert data["solar_kw"] == 40.0
    elif event == "TARIFF_SPIKE":
        assert data["solar_kw"] == 0.0

@patch("optimizer.VppOptimizer.safe_solve")
@patch("optimizer.VppOptimizer.check_worst_case")
@patch("optimizer.VppOptimizer.benchmark_dispatch_savings")
def test_optimize_valid_body(mock_benchmark, mock_check, mock_solve, client):
    mock_plan = {
        "status": "optimal",
        "p_bat_ch": [0.0]*24,
        "p_bat_dis": [0.0]*24,
        "p_grid_imp": [0.0]*24,
        "p_grid_exp": [0.0]*24,
        "soc": [150.0]*24,
        "total_cost_inr": 1000.0,
        "solve_time_ms": 10.0,
        "is_emergency_plan": False
    }
    mock_solve.return_value = mock_plan
    mock_check.return_value = (False, mock_plan)
    mock_benchmark.return_value = {
        "greedy_cost_rupees": 1500.0,
        "arbitrage_savings_rupees": 500.0,
        "savings_percentage": 33.3
    }
    
    response = client.post("/api/optimize", json={"horizon_hours": 24, "initial_soc_kwh": 100.0})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["optimal", "emergency"]

def test_optimize_invalid_bodies(client):
    # horizon_hours < 1
    resp1 = client.post("/api/optimize", json={"horizon_hours": 0, "initial_soc_kwh": 100.0})
    assert resp1.status_code == 422
    
    # horizon_hours > 72
    resp2 = client.post("/api/optimize", json={"horizon_hours": 100, "initial_soc_kwh": 100.0})
    assert resp2.status_code == 422
    
    # initial_soc_kwh < 0
    resp3 = client.post("/api/optimize", json={"horizon_hours": 24, "initial_soc_kwh": -10.0})
    assert resp3.status_code == 422

@patch("optimizer.VppOptimizer.safe_solve")
@patch("optimizer.VppOptimizer.benchmark_dispatch_savings")
@pytest.mark.parametrize("scenario", ["heatwave", "wind_drought", "storm", "monsoon", "cloud_cover", "tariff_spike"])
def test_demo_scenario_valid(mock_benchmark, mock_solve, client, scenario):
    mock_plan = {
        "status": "optimal",
        "p_bat_ch": [0.0]*24,
        "p_bat_dis": [0.0]*24,
        "p_grid_imp": [0.0]*24,
        "p_grid_exp": [0.0]*24,
        "soc": [150.0]*24,
        "total_cost_inr": 1000.0,
        "solve_time_ms": 10.0,
        "is_emergency_plan": False
    }
    mock_solve.return_value = mock_plan
    mock_benchmark.return_value = {
        "greedy_cost_rupees": 1500.0,
        "arbitrage_savings_rupees": 500.0,
        "savings_percentage": 33.3
    }

    response = client.post("/api/demo/scenario", json={"name": scenario, "override": {}})
    assert response.status_code == 200
    assert response.json()["status"] in ["optimal", "emergency"]

def test_demo_scenario_invalid_name(client):
    response = client.post("/api/demo/scenario", json={"name": "unknown_scenario"})
    assert response.status_code == 400

def test_demo_scenario_invalid_override(client):
    response = client.post("/api/demo/scenario", json={"name": "heatwave", "override": {"solar_factor": -1.0}})
    assert response.status_code == 422
    
    response2 = client.post("/api/demo/scenario", json={"name": "heatwave", "override": {"demand_factor": 10.0}})
    assert response2.status_code == 422
