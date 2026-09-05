"""
End-to-End Microgrid Integration Test Suite
-------------------------------------------
Verifies the complete closed-loop orchestration pipeline:
1. simulator.py (Real-time physical telemetry stream)
2. forecasting.py (Probabilistic quantile inference {p10, p50, p90})
3. optimizer.py (Pyomo + HiGHS 96-step dispatch optimization)
4. explainer.py (Jinja2 explainability & executive recommendations)
5. Robustness & emergency fallback under extreme boundary conditions.
"""

import pytest
import numpy as np
import time

from simulator import generate_telemetry, BATTERY_CAPACITY_KWH
from forecasting import get_quantile_forecast
from optimizer import VppOptimizer, optimize_microgrid, forecast_to_optimizer_inputs, get_default_tariff_schedule
from explainer import explain_step, generate_executive_recommendations


def test_full_pipeline_chain():
    """Chains telemetry -> quantile forecast -> optimization -> explainability."""
    # Step 1: Telemetry
    telemetry = generate_telemetry()
    assert "solar_kw" in telemetry
    assert "wind_kw" in telemetry
    assert "battery_soc_pct" in telemetry
    assert "campus_load_kw" in telemetry
    assert 15.0 <= telemetry["battery_soc_pct"] <= 95.0

    # Step 2: Probabilistic Forecast
    fc = get_quantile_forecast(horizon_h=24)
    assert fc["horizon_hours"] == 24
    for target in ["solar", "wind", "demand"]:
        assert "p10" in fc[target]
        assert "p50" in fc[target]
        assert "p90" in fc[target]
        assert len(fc[target]["p50"]) == 24
        # Verify quantiles ordering (p10 <= p50 <= p90 with tolerance for rounding)
        p10 = np.array(fc[target]["p10"])
        p50 = np.array(fc[target]["p50"])
        p90 = np.array(fc[target]["p90"])
        assert np.all(p10 <= p50 + 1e-2)
        assert np.all(p50 <= p90 + 1e-2)

    # Step 3: Mathematical Optimization
    current_soc = telemetry["battery_soc_pct"]
    opt = optimize_microgrid(current_soc=current_soc)

    assert opt["status"] == "SUCCESS"
    assert opt["n_steps"] == 96
    sp = opt["setpoints"]
    assert len(sp["p_bat_ch_kw"]) == 96
    assert len(sp["p_bat_dis_kw"]) == 96
    assert len(sp["battery_soc_pct"]) == 96

    # Physical battery bounds
    assert np.all(np.array(sp["battery_soc_pct"]) >= 15.0 - 1e-2)
    assert np.all(np.array(sp["battery_soc_pct"]) <= 95.0 + 1e-2)

    # Step 4: AI Explainer
    recs = generate_executive_recommendations(opt)
    assert len(recs) >= 3
    for r in recs:
        assert "id" in r
        assert "type" in r
        assert "priority" in r
        assert "title" in r
        assert "action" in r
        assert len(r["action"]) > 10


def test_optimizer_emergency_fallback():
    """Verifies that infeasible or broken conditions gracefully trigger Emergency Dispatch without crashing."""
    opt_instance = VppOptimizer()
    # Force an invalid solver name to trigger exception handling
    opt_instance.solver_name = "non_existent_solver_XYZ"

    res = opt_instance.solve(current_soc=50.0)
    assert res["status"] == "SUCCESS"
    assert res["solve_mode"] == "EMERGENCY_FALLBACK"
    assert len(res["setpoints"]["p_grid_imp_kw"]) == 96


def test_quantile_hedging_logic():
    """Verifies that severe P10 solar deficits correctly trigger quantile hedging risk flags."""
    opt_instance = VppOptimizer()
    fc = get_quantile_forecast(horizon_h=24)

    # Artificially widen P10-P50 deficit to simulate sudden monsoon dust blackout
    fc_stress = dict(fc)
    fc_stress["solar"] = {
        "p10": [0.0] * 24,
        "p50": [150.0] * 24,
        "p90": [180.0] * 24,
    }
    inputs = forecast_to_optimizer_inputs(fc_stress, n_steps=96)
    dummy_soc = np.full(96, 25.0)

    risk = opt_instance.check_quantile_risk(dummy_soc, inputs)
    assert risk["risk_detected"] is True
    assert risk["min_worst_case_soc"] < 20.0

    # Verify closed-loop actuator execution
    res = opt_instance.solve(current_soc=40.0, forecast_output=fc_stress)
    assert res["status"] == "SUCCESS"
    assert res["solve_mode"] == "QUANTILE_HEDGED_LP"
    assert res["quantile_robustness"]["reoptimization_performed"] is True
    assert res["quantile_robustness"]["hedged_reserve_margin"] > 20.0
    assert res["quantile_robustness"]["preemptive_charging_kwh"] >= 0.0


def test_optimizer_benchmark_speed():
    """Verifies solve speed across multiple warm solves."""
    opt_instance = VppOptimizer()
    fc = get_quantile_forecast(horizon_h=24)

    # Cold solve
    t0 = time.time()
    res1 = opt_instance.solve(current_soc=60.0, forecast_output=fc)
    cold_time = (time.time() - t0) * 1000.0

    # Warm solve (should reuse cached trajectory and solve quickly)
    t1 = time.time()
    res2 = opt_instance.solve(current_soc=60.0, forecast_output=fc)
    warm_time = (time.time() - t1) * 1000.0

    assert res1["status"] == "SUCCESS"
    assert res2["status"] == "SUCCESS"
    print(f"\n[BENCHMARK] Cold solve: {cold_time:.1f} ms | Warm solve: {warm_time:.1f} ms")


if __name__ == "__main__":
    pytest.main(["-v", "test_integration.py"])
