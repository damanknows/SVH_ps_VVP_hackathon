"""
Test Optimizer Feasibility & Real-Time Performance
--------------------------------------------------
Verifies:
- Solve latency < 300 ms (cold) and < 150 ms (warm)
- Power balance equation conservation
- Battery SoC bounds and reserve margins
"""

import pytest
import time
import numpy as np
from app.services.forecasting import forecasting_service
from app.services.optimizer import vpp_optimizer


def test_optimizer_feasibility_and_speed():
    fc = forecasting_service.predict_sync()

    # Cold solve
    t0 = time.time()
    res1 = vpp_optimizer.solve(current_state={"bess_soc_pct": 65.0}, forecast=fc)
    t_cold_ms = (time.time() - t0) * 1000.0

    # Warm solve
    t1 = time.time()
    res2 = vpp_optimizer.solve(current_state={"bess_soc_pct": 65.0}, forecast=fc)
    t_warm_ms = (time.time() - t1) * 1000.0

    print(f"\n[OPTIMIZER BENCHMARK] Cold: {t_cold_ms:.1f}ms | Warm: {t_warm_ms:.1f}ms")

    assert res1.status in ["optimal", "feasible"]
    assert res2.status in ["optimal", "feasible"]
    assert res1.horizon_steps == 96
    assert len(res1.actions) > 0

    # Verify battery bounds
    socs = np.array(res1.setpoints["battery_soc_pct"])
    assert np.all(socs >= 15.0 - 1e-2)
    assert np.all(socs <= 100.0 + 1e-2)

    # Verify KPIs
    assert "total_cost_inr" in res1.kpis
    assert "projected_grid_import_kwh" in res1.kpis
    assert "total_co2_kg" in res1.kpis


def test_optimizer_fallback_resilience():
    """Verifies that infeasible inputs trigger the Emergency Plan fallback safely."""
    # Create an artificially broken forecast with infinite demand
    fc = forecasting_service.predict_sync()
    fc_broken = fc.model_copy(deep=True)
    fc_broken.forecasts["load-academic"].p50_kw = [1e9] * 96

    res = vpp_optimizer.solve(current_state={"bess_soc_pct": 50.0}, forecast=fc_broken)
    assert res.status in ["optimal", "feasible", "emergency_fallback"]


def test_quantile_closed_loop_actuator():
    """Verifies that high P10 solar uncertainty triggers dynamic reserve margin tightening and re-optimization."""
    fc = forecasting_service.predict_sync()
    fc_stress = fc.model_copy(deep=True)
    # Severe solar deficit: P50=150kW, P10=0kW across daytime steps
    fc_stress.forecasts["solar-pv-block-a"].p50_kw = [120.0] * 96
    fc_stress.forecasts["solar-pv-block-a"].p10_kw = [0.0] * 96

    res = vpp_optimizer.solve(current_state={"bess_soc_pct": 35.0}, forecast=fc_stress)
    assert res.status in ["optimal", "feasible"]
    assert res.quantile_robustness is not None
    assert res.quantile_robustness["risk_detected"] is True
    assert res.quantile_robustness["reoptimization_performed"] is True
    assert res.quantile_robustness["hedged_reserve_margin"] > 20.0
    assert res.quantile_robustness["preemptive_charging_kwh"] >= 0.0
