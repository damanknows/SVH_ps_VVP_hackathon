"""
Unit & Performance Tests for VPP Dispatch Optimizer
---------------------------------------------------
Validates physical constraints (power balance, SoC dynamics, ramp rate, reserve margin),
terminal SoC conservation, warm-start speedups, safe-solve slack relaxation, and
stress-testing under P10 pessimistic solar profiles.
"""

import time
import pytest
import numpy as np
from optimizer import VppOptimizer


@pytest.fixture(scope="module")
def opt():
    return VppOptimizer()


@pytest.fixture
def diurnal_profiles():
    # 24-hour realistic campus generation and load profile
    solar = np.array([
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        15.0, 45.0, 95.0, 140.0, 175.0, 190.0,
        185.0, 150.0, 105.0, 60.0, 20.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    ], dtype=float)
    wind = np.array([
        18.0, 17.0, 16.0, 15.0, 16.0, 18.0,
        20.0, 22.0, 24.0, 25.0, 22.0, 20.0,
        19.0, 18.0, 20.0, 22.0, 25.0, 26.0,
        25.0, 24.0, 22.0, 20.0, 19.0, 18.0
    ], dtype=float)
    demand = np.array([
        110.0, 105.0, 100.0, 100.0, 105.0, 120.0,
        140.0, 160.0, 190.0, 210.0, 215.0, 205.0,
        195.0, 205.0, 210.0, 220.0, 225.0, 215.0,
        200.0, 185.0, 165.0, 145.0, 130.0, 120.0
    ], dtype=float)
    return solar, wind, demand


def test_lp_constraints_satisfaction(opt, diurnal_profiles):
    solar, wind, demand = diurnal_profiles
    init_soc = 150.0

    res = opt.solve(solar, wind, demand, initial_soc=init_soc, start_hour=8, warm_start=False)
    assert res["status"] == "optimal"

    p_ch = np.array(res["p_bat_ch"])
    p_dis = np.array(res["p_bat_dis"])
    p_imp = np.array(res["p_grid_imp"])
    p_exp = np.array(res["p_grid_exp"])
    soc = np.array(res["soc"])

    # 1. Power balance invariant at each timestep
    for t in range(24):
        lhs = solar[t] + wind[t] + p_dis[t] + p_imp[t]
        rhs = demand[t] + p_ch[t] + p_exp[t]
        assert pytest.approx(lhs, abs=1e-3) == rhs

    # 2. Dynamic SoC continuity
    curr_soc = init_soc
    for t in range(24):
        delta = (opt.eta_ch * p_ch[t] - (1.0 / opt.eta_dis) * p_dis[t]) * opt.dt_h
        curr_soc += delta
        assert pytest.approx(soc[t], abs=1e-3) == curr_soc

    # 3. Reserve margin invariant
    assert np.all(soc >= opt.soc_min - 1e-3)
    assert np.all(soc <= opt.soc_max + 1e-3)

    # 4. Ramp-rate limits on charging
    for t in range(1, 24):
        ramp = abs(p_ch[t] - p_ch[t - 1])
        assert ramp <= opt.ramp_max + 1e-3

    # 5. Terminal SoC conservation
    assert soc[-1] >= init_soc - 1e-3


def test_solver_performance_benchmarks(opt, diurnal_profiles):
    solar, wind, demand = diurnal_profiles

    # Cold solve (new problem, clean cache)
    opt.last_soc_trajectory = None
    t0 = time.perf_counter()
    cold_res = opt.solve(solar, wind, demand, initial_soc=140.0, warm_start=False)
    t_cold_ms = (time.perf_counter() - t0) * 1000.0

    assert cold_res["status"] == "optimal"

    # Warm solve (pre-seeded with previous trajectory)
    t1 = time.perf_counter()
    warm_res = opt.solve(solar, wind, demand, initial_soc=140.0, warm_start=True)
    t_warm_ms = (time.perf_counter() - t1) * 1000.0

    assert warm_res["status"] == "optimal"

    print(f"\n[PERFORMANCE BENCHMARK] Cold Solve: {t_cold_ms:.2f} ms | Warm Solve: {t_warm_ms:.2f} ms")
    assert t_cold_ms < 300.0, f"Cold solve exceeded 300ms SLA! Measured: {t_cold_ms:.2f} ms"
    assert t_warm_ms < 100.0, f"Warm solve exceeded 100ms SLA! Measured: {t_warm_ms:.2f} ms"


def test_safe_solve_slack_relaxation(opt):
    # Extreme artificial demand of 900 kW (exceeding grid import limit 500 kW + generation 0 kW + battery discharge 50 kW)
    # This must trigger the slack variable relaxation without raising an unhandled exception
    solar_zero = np.zeros(24)
    wind_zero = np.zeros(24)
    extreme_demand = np.full(24, 700.0)

    res = opt.safe_solve(solar_zero, wind_zero, extreme_demand, initial_soc=50.0)
    assert res["status"] in ["emergency", "optimal"]
    assert res.get("is_emergency_plan") is True or res["status"] == "emergency"
    assert len(res["soc"]) == 24


def test_worst_case_check_and_conservative_charge(opt, diurnal_profiles):
    solar, wind, demand = diurnal_profiles
    plan = opt.solve(solar, wind, demand, initial_soc=60.0)

    # Low solar P10 profile (severe cloud cover)
    p10_solar = solar * 0.10

    breached, adjusted = opt.check_worst_case(plan, p10_solar, wind, demand, initial_soc=60.0)
    # Check that function evaluated without error and returned consistent structure
    assert isinstance(breached, bool)
    assert "worst_case_flagged" in adjusted
    assert len(adjusted["p_bat_ch"]) == 24
    if breached:
        # Assert conservative setpoint adjustments applied at t=0
        assert adjusted["p_bat_dis"][0] == 0.0
        assert adjusted["p_bat_ch"][0] >= plan["p_bat_ch"][0]


def test_worst_case_check_does_not_mutate_caller_plan(opt, diurnal_profiles):
    """
    Regression test: check_worst_case() used to do `dict(planned_schedule)`,
    which is only a SHALLOW copy — the underlying lists (p_bat_ch, p_bat_dis,
    p_grid_imp, p_grid_exp, soc) were the same list objects as the caller's
    original plan. In-place edits like `adjusted["p_bat_dis"][0] = 0.0` then
    silently corrupted `plan` itself.

    It also exercises the corrected worst-case criterion: with solar forced to
    zero (P10) at a high-demand hour, the grid import required to keep the
    power balance satisfied for the (unchanged) planned battery setpoints must
    exceed the grid's import capacity, which should trigger `is_breached`.
    Previously the check replayed the fixed battery SoC trajectory and clipped
    it to [0, b_cap] — a bound the LP-produced schedule already satisfies by
    construction — so it could essentially never flag a breach regardless of
    how bad p10_solar_kw was.
    """
    solar, wind, demand = diurnal_profiles
    plan = opt.solve(solar, wind, demand, initial_soc=150.0)

    original_p_bat_dis = list(plan["p_bat_dis"])
    original_p_bat_ch = list(plan["p_bat_ch"])
    original_p_grid_imp = list(plan["p_grid_imp"])

    # Zero solar and zero wind all day, against the unchanged planned
    # schedule, forces required grid import well past p_imp_max somewhere
    # in the horizon (demand alone reaches ~225 kW, comfortably under the
    # 500 kW cap on its own — so also slash the import cap for this test via
    # a throwaway optimizer instance sharing config, to make the breach
    # deterministic without depending on demand magnitude).
    opt.p_imp_max = 50.0  # temporarily tighten grid import capacity for this test
    try:
        p10_solar = solar * 0.0
        zero_wind = wind * 0.0
        breached, adjusted = opt.check_worst_case(plan, p10_solar, zero_wind, demand, initial_soc=150.0)
    finally:
        opt.p_imp_max = 500.0  # restore

    assert breached is True, "Test setup should force a worst-case grid-import breach"

    # adjusted is allowed (expected) to differ from plan at t=0 ...
    assert adjusted["p_bat_dis"][0] == 0.0
    # ... but the caller's original `plan` dict must be completely untouched.
    assert plan["p_bat_dis"] == original_p_bat_dis
    assert plan["p_bat_ch"] == original_p_bat_ch
    assert plan["p_grid_imp"] == original_p_grid_imp
    assert adjusted["p_bat_ch"] is not plan["p_bat_ch"]
    assert adjusted["p_bat_dis"] is not plan["p_bat_dis"]


def test_benchmark_dispatch_savings(opt, diurnal_profiles):
    solar, wind, demand = diurnal_profiles
    res = opt.benchmark_dispatch_savings(solar, wind, demand, initial_soc=150.0, start_hour=0)

    assert "greedy_cost_rupees" in res
    assert "optimal_cost_rupees" in res
    assert "arbitrage_savings_rupees" in res
    assert "savings_percentage" in res
    assert "hourly_schedule" in res
    assert len(res["hourly_schedule"]["p_bat_ch"]) == 24
    assert res["arbitrage_savings_rupees"] >= 0.0


def test_check_worst_case_does_not_mutate_original(opt, diurnal_profiles):
    solar, wind, demand = diurnal_profiles
    
    # Mock a valid schedule to avoid depending on the solver's availability
    plan = {
        "status": "optimal",
        "p_bat_ch": [10.0] * 24,
        "p_bat_dis": [5.0] * 24,
        "p_grid_imp": [20.0] * 24,
        "p_grid_exp": [0.0] * 24,
        "soc": [60.0] * 24,
        "total_cost_inr": 1000.0
    }
    
    import copy
    original_plan = copy.deepcopy(plan)
    
    p10_solar = solar * 0.10
    # This should trigger a breach and modification in adjusted
    breached, adjusted = opt.check_worst_case(plan, p10_solar, wind, demand, initial_soc=60.0)
    
    # The original plan should remain entirely unmodified
    assert plan["p_bat_ch"] == original_plan["p_bat_ch"]
    assert plan["p_bat_dis"] == original_plan["p_bat_dis"]
    assert plan["p_grid_imp"] == original_plan["p_grid_imp"]
