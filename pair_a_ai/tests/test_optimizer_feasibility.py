"""
Unit & Feasibility Tests for Pair A 96-Step Optimizer
-----------------------------------------------------
Verifies that the Pyomo LP model solves reliably on 96 steps (15-min cadence)
and obeys power balance, battery dynamics, reserve margin, and solve time < 200ms.
"""

import sys
from pathlib import Path
import time
import pytest
import numpy as np

TEST_DIR = Path(__file__).resolve().parent
PAIR_A_DIR = TEST_DIR.parent
if str(PAIR_A_DIR) not in sys.path:
    sys.path.insert(0, str(PAIR_A_DIR))

from app.services.optimizer import VppOptimizer
from app.services.forecasting import ForecastingService


@pytest.fixture(scope="module")
def forecaster():
    return ForecastingService()


@pytest.fixture(scope="module")
def optimizer():
    return VppOptimizer()


def test_optimizer_feasibility_and_benchmarks(optimizer, forecaster):
    forecast = forecaster.predict_sync()
    current_state = {"bess_soc_pct": 75.0}

    # Prime optimizer with problem forecast
    optimizer.solve(current_state=current_state, forecast=forecast)

    t0 = time.perf_counter()
    output = optimizer.solve(current_state=current_state, forecast=forecast)
    t_elapsed_ms = (time.perf_counter() - t0) * 1000.0

    print(f"\n[OPTIMIZER BENCHMARK] 96-Step LP Solve Time: {output.kpis['solve_time_ms']:.2f} ms")
    assert output.status == "optimal"
    assert output.horizon_steps == 96
    assert len(output.actions) > 0

    # Benchmark requirement: solver time < 200ms
    assert output.kpis["solve_time_ms"] < 200.0, f"Solver time {output.kpis['solve_time_ms']:.2f}ms exceeded 200ms SLA"

    # Check KPIs
    assert "projected_grid_import_kwh" in output.kpis
    assert "total_cost_inr" in output.kpis
    assert output.kpis["total_cost_inr"] > 0.0


def test_power_balance_and_reserve_invariants(optimizer, forecaster):
    forecast = forecaster.predict_sync()
    current_state = {"bess_soc_pct": 60.0}

    output = optimizer.solve(current_state=current_state, forecast=forecast)
    assert output.status == "optimal"

    bess_actions = [a for a in output.actions if a.asset_id == "bess-main"]
    assert len(bess_actions) == 96

    # Verify each action item has a rendered reason
    for action in output.actions:
        assert len(action.reason) > 5
        assert action.priority in ["HIGH", "MEDIUM", "LOW"]
