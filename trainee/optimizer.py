"""
VPP Microgrid Mathematical Optimization Engine (Pyomo + HiGHS)
--------------------------------------------------------------
Formulates and solves a 96-step (15-minute resolution, 24-hour horizon)
Linear Program (LP) for campus microgrid economic dispatch:
- Objective: Minimize Net Cost = Grid Import Cost - Grid Export Revenue +
             Battery Degradation Cost + Carbon Intensity Surcharge.
- Constraints: Multi-period power balance, physical battery SoC dynamics,
               charge/discharge power rate limits, and reserve margins.
- Robustness: Infeasible exception handling with slack relaxation and
              Emergency Dispatch fallback.
- Quantile-Aware Hedging: Simulates worst-case P10 solar trajectory and forces
                          preemptive conservative charging if reserve violation risk > 10%.
- Warm-Starting: Caches previous SoC trajectory to accelerate subsequent solves.
"""

from typing import Dict, Any, List, Optional
import time
import numpy as np
import pandas as pd
import pyomo.environ as pyo

BATTERY_CAPACITY_KWH = 500.0  # Shared single source of truth with simulator.py
P_BAT_MAX_KW = 100.0          # Max charge/discharge converter rating
ETA_CH = 0.95                 # Charging efficiency
ETA_DIS = 0.95                # Discharging efficiency
SOC_MIN = 15.0                # Minimum physical depth-of-discharge limit (%)
SOC_MAX = 95.0                # Maximum physical charge limit (%)
DEFAULT_RESERVE_MARGIN = 20.0 # Standard reserve margin (%)
P_GRID_MAX_KW = 350.0         # Campus transformer import/export ceiling

CARBON_INTENSITY_GRID = 0.82  # kg CO2 / kWh of grid electricity
CARBON_TAX_PER_KG = 0.05      # Rs. / kg CO2 environmental surcharge
DEGRADATION_COST_PER_KWH = 0.40  # Rs. / kWh battery throughput amortization


def get_default_tariff_schedule(n_steps: int = 96) -> Dict[str, np.ndarray]:
    """
    Returns Rajasthan Time-of-Day (ToD) tariff structure for 96 15-minute intervals.
    - Peak (18:00 - 22:00, steps 72-88): Rs. 11.50/kWh import, Rs. 4.50/kWh export
    - Day/Normal (06:00 - 18:00, steps 24-72): Rs. 7.50/kWh import, Rs. 3.80/kWh export
    - Off-Peak Night (22:00 - 06:00, steps 0-24, 88-96): Rs. 5.20/kWh import, Rs. 3.00/kWh export
    """
    cost_imp = np.full(n_steps, 7.50)
    rev_exp = np.full(n_steps, 3.80)

    for step in range(n_steps):
        hour = step * 0.25
        if 18.0 <= hour < 22.0:
            cost_imp[step] = 11.50
            rev_exp[step] = 4.50
        elif hour >= 22.0 or hour < 6.0:
            cost_imp[step] = 5.20
            rev_exp[step] = 3.00

    return {"import": cost_imp, "export": rev_exp}


def forecast_to_optimizer_inputs(forecast_output: Dict[str, Any], n_steps: int = 96) -> Dict[str, np.ndarray]:
    """
    Adapter function mapping forecasting.py schema (24 hourly predictions)
    into 96 15-minute intervals via linear interpolation.
    """
    h_in = np.arange(len(forecast_output["solar"]["p50"]))
    step_eval = np.linspace(0, len(h_in) - 1, n_steps)

    solar_p50 = np.interp(step_eval, h_in, forecast_output["solar"]["p50"])
    solar_p10 = np.interp(step_eval, h_in, forecast_output["solar"]["p10"])
    solar_p90 = np.interp(step_eval, h_in, forecast_output["solar"]["p90"])

    wind_p50 = np.interp(step_eval, h_in, forecast_output["wind"]["p50"])
    wind_p10 = np.interp(step_eval, h_in, forecast_output["wind"]["p10"])
    wind_p90 = np.interp(step_eval, h_in, forecast_output["wind"]["p90"])

    demand_p50 = np.interp(step_eval, h_in, forecast_output["demand"]["p50"])
    demand_p10 = np.interp(step_eval, h_in, forecast_output["demand"]["p10"])
    demand_p90 = np.interp(step_eval, h_in, forecast_output["demand"]["p90"])

    return {
        "solar_p50": np.round(solar_p50, 2),
        "solar_p10": np.round(solar_p10, 2),
        "solar_p90": np.round(solar_p90, 2),
        "wind_p50": np.round(wind_p50, 2),
        "wind_p10": np.round(wind_p10, 2),
        "wind_p90": np.round(wind_p90, 2),
        "demand_p50": np.round(demand_p50, 2),
        "demand_p10": np.round(demand_p10, 2),
        "demand_p90": np.round(demand_p90, 2),
        "n_steps": n_steps,
        "dt_hours": 24.0 / n_steps,
    }


class VppOptimizer:
    """
    High-Performance Virtual Power Plant Microgrid Dispatch Optimizer.
    """
    def __init__(self):
        self.last_soc_trajectory: Optional[List[float]] = None
        self.solver_name = "appsi_highs"

    def build_model(
        self,
        current_soc: float,
        inputs: Dict[str, np.ndarray],
        tariff: Dict[str, np.ndarray],
        reserve_margin: float = DEFAULT_RESERVE_MARGIN,
    ) -> pyo.ConcreteModel:
        """
        Builds the 96-step Pyomo ConcreteModel LP formulation.
        """
        n_steps = inputs["n_steps"]
        dt = inputs["dt_hours"]

        m = pyo.ConcreteModel(name="VPP_Microgrid_Optimization")
        m.T = pyo.RangeSet(0, n_steps - 1)

        # Decision Variables
        m.P_bat_ch = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0, P_BAT_MAX_KW))
        m.P_bat_dis = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0, P_BAT_MAX_KW))
        m.P_grid_imp = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0, P_GRID_MAX_KW))
        m.P_grid_exp = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0, P_GRID_MAX_KW))
        m.SoC = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(SOC_MIN, SOC_MAX))
        # Slack variable to guarantee feasibility under extreme stress
        m.s_margin = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0, 50.0))

        # Objective Function
        def obj_rule(model):
            net_cost = 0.0
            slack_penalty = 1000.0  # Heavy penalty on violating target reserve margin

            for t in model.T:
                c_imp = tariff["import"][t]
                c_exp = tariff["export"][t]
                p_imp = model.P_grid_imp[t]
                p_exp = model.P_grid_exp[t]
                p_ch = model.P_bat_ch[t]
                p_dis = model.P_bat_dis[t]

                # 1. Grid Energy Cost / Revenue
                cost_grid = (c_imp * p_imp - c_exp * p_exp) * dt
                # 2. Battery degradation cost
                cost_deg = DEGRADATION_COST_PER_KWH * (p_ch + p_dis) * dt
                # 3. Carbon emissions surcharge
                cost_carb = (CARBON_INTENSITY_GRID * CARBON_TAX_PER_KG) * p_imp * dt
                # 4. Feasibility relaxation penalty
                cost_slack = slack_penalty * model.s_margin[t]

                net_cost += cost_grid + cost_deg + cost_carb + cost_slack

            return net_cost

        m.obj = pyo.Objective(rule=obj_rule, sense=pyo.minimize)

        # Constraints
        # 1. Power Balance
        def power_balance_rule(model, t):
            gen = inputs["solar_p50"][t] + inputs["wind_p50"][t]
            load = inputs["demand_p50"][t]
            return (gen + model.P_grid_imp[t] + model.P_bat_dis[t]) == (load + model.P_grid_exp[t] + model.P_bat_ch[t])

        m.power_balance = pyo.Constraint(m.T, rule=power_balance_rule)

        # 2. Battery State of Charge (SoC) Dynamics
        # delta_soc_pct = ((P_ch * eta_ch - P_dis / eta_dis) * dt / Capacity) * 100
        conversion_factor = (dt / BATTERY_CAPACITY_KWH) * 100.0

        def soc_rule(model, t):
            delta = (model.P_bat_ch[t] * ETA_CH - model.P_bat_dis[t] / ETA_DIS) * conversion_factor
            if t == 0:
                return model.SoC[t] == current_soc + delta
            else:
                return model.SoC[t] == model.SoC[t - 1] + delta

        m.soc_dynamics = pyo.Constraint(m.T, rule=soc_rule)

        # 3. Reserve Margin with Slack
        def reserve_margin_rule(model, t):
            return model.SoC[t] + model.s_margin[t] >= reserve_margin

        m.reserve_margin_con = pyo.Constraint(m.T, rule=reserve_margin_rule)

        # Warm start seeding from previous trajectory if available
        if self.last_soc_trajectory is not None and len(self.last_soc_trajectory) == n_steps:
            for t in range(n_steps):
                m.SoC[t].value = self.last_soc_trajectory[t]

        return m

    def check_quantile_risk(
        self,
        planned_soc: np.ndarray,
        inputs: Dict[str, np.ndarray],
        reserve_margin: float = DEFAULT_RESERVE_MARGIN,
    ) -> Dict[str, Any]:
        """
        Quantile-Aware Robustness Check:
        Computes worst-case SoC trajectory under P10 solar deficit.
        If reserve violation exceeds 10%, signals a risk flag for conservative dispatch.
        """
        dt = inputs["dt_hours"]
        n_steps = len(planned_soc)

        solar_deficit = np.maximum(0.0, inputs["solar_p50"] - inputs["solar_p10"])
        cumulative_deficit_kwh = np.cumsum(solar_deficit * dt)
        worst_case_soc = planned_soc - (cumulative_deficit_kwh / BATTERY_CAPACITY_KWH) * 100.0

        min_worst_soc = float(np.min(worst_case_soc))
        risk_detected = min_worst_soc < (reserve_margin * 0.90)  # > 10% below reserve

        return {
            "risk_detected": risk_detected,
            "min_worst_case_soc": round(min_worst_soc, 2),
            "solar_p10_deficit_kwh": round(float(cumulative_deficit_kwh[-1]), 2),
            "reoptimization_performed": False,
        }

    def solve(
        self,
        current_soc: float = 65.0,
        forecast_output: Optional[Dict[str, Any]] = None,
        tariff: Optional[Dict[str, np.ndarray]] = None,
        reserve_margin: float = DEFAULT_RESERVE_MARGIN,
    ) -> Dict[str, Any]:
        """
        Solves the VPP microgrid optimization problem with warm starting and emergency fallback.
        """
        start_time = time.time()
        n_steps = 96

        # Adapter: prepare inputs
        if forecast_output is None:
            from forecasting import get_quantile_forecast
            forecast_output = get_quantile_forecast(horizon_h=24)

        inputs = forecast_to_optimizer_inputs(forecast_output, n_steps=n_steps)
        if tariff is None:
            tariff = get_default_tariff_schedule(n_steps=n_steps)

        # Build Pyomo model
        m = self.build_model(current_soc, inputs, tariff, reserve_margin)

        # Solve using HiGHS
        try:
            solver = pyo.SolverFactory(self.solver_name)
            solver.highs_options = {
                "parallel": "on",
                "presolve": "on",
                "time_limit": 10.0,
            }
            results = solver.solve(m)

            # Check solver termination status
            status_ok = (results.solver.status == pyo.SolverStatus.ok) and (
                results.solver.termination_condition in [
                    pyo.TerminationCondition.optimal,
                    pyo.TerminationCondition.feasible,
                ]
            )
            if not status_ok:
                raise RuntimeError(f"Solver returned non-optimal status: {results.solver.termination_condition}")

            # Extract variables
            p_bat_ch = np.array([pyo.value(m.P_bat_ch[t]) for t in m.T]).round(2)
            p_bat_dis = np.array([pyo.value(m.P_bat_dis[t]) for t in m.T]).round(2)
            p_grid_imp = np.array([pyo.value(m.P_grid_imp[t]) for t in m.T]).round(2)
            p_grid_exp = np.array([pyo.value(m.P_grid_exp[t]) for t in m.T]).round(2)
            soc = np.array([pyo.value(m.SoC[t]) for t in m.T]).round(2)

            # Update warm start cache
            self.last_soc_trajectory = soc.tolist()
            solve_mode = "OPTIMAL_LP"

        except Exception as ex:
            # EMERGENCY PLAN FALLBACK (H3-H4 step 1)
            # Guarantee zero crash during live demo: Grid import covers deficits safely
            print(f"[OPTIMIZER WARNING] Pyomo solver triggered fallback ({ex}). Executing Emergency Dispatch.")
            p_bat_ch = np.zeros(n_steps)
            p_bat_dis = np.zeros(n_steps)
            soc = np.full(n_steps, current_soc)

            net_gen = inputs["solar_p50"] + inputs["wind_p50"] - inputs["demand_p50"]
            p_grid_imp = np.maximum(0.0, -net_gen).round(2)
            p_grid_exp = np.maximum(0.0, net_gen).round(2)
            solve_mode = "EMERGENCY_FALLBACK"

        # Quantile robustness check
        risk_info = self.check_quantile_risk(soc, inputs, reserve_margin=reserve_margin)

        # CLOSED-LOOP QUANTILE RE-OPTIMIZATION ACTUATOR:
        # When worst-case projected P10 solar deficit depletes SoC below target reserve,
        # dynamically boost the reserve margin constraint and re-solve to force preemptive BESS charging!
        if risk_info.get("risk_detected", False) and solve_mode == "OPTIMAL_LP":
            min_worst_soc = risk_info.get("min_worst_case_soc", reserve_margin)
            soc_deficit = max(0.0, reserve_margin - min_worst_soc)
            tightened_reserve = min(85.0, round(reserve_margin + soc_deficit + 2.5, 1))

            m_hedged = self.build_model(current_soc, inputs, tariff, reserve_margin=tightened_reserve)
            try:
                results_hedged = solver.solve(m_hedged)
                status_hedged_ok = (results_hedged.solver.status == pyo.SolverStatus.ok) and (
                    results_hedged.solver.termination_condition in [
                        pyo.TerminationCondition.optimal,
                        pyo.TerminationCondition.feasible,
                    ]
                )
                if status_hedged_ok:
                    p_bat_ch_base = p_bat_ch.copy()
                    p_bat_ch = np.array([pyo.value(m_hedged.P_bat_ch[t]) for t in m_hedged.T]).round(2)
                    p_bat_dis = np.array([pyo.value(m_hedged.P_bat_dis[t]) for t in m_hedged.T]).round(2)
                    p_grid_imp = np.array([pyo.value(m_hedged.P_grid_imp[t]) for t in m_hedged.T]).round(2)
                    p_grid_exp = np.array([pyo.value(m_hedged.P_grid_exp[t]) for t in m_hedged.T]).round(2)
                    soc = np.array([pyo.value(m_hedged.SoC[t]) for t in m_hedged.T]).round(2)
                    self.last_soc_trajectory = soc.tolist()

                    solve_mode = "QUANTILE_HEDGED_LP"
                    preempt_kwh = float(np.sum(np.maximum(0.0, p_bat_ch - p_bat_ch_base) * inputs["dt_hours"]))
                    risk_info["reoptimization_performed"] = True
                    risk_info["hedged_reserve_margin"] = tightened_reserve
                    risk_info["preemptive_charging_kwh"] = round(preempt_kwh, 2)
            except Exception as ex_hedged:
                pass

        solve_time_ms = round((time.time() - start_time) * 1000.0, 2)

        # Financial & Carbon Summaries
        dt = inputs["dt_hours"]
        total_import_kwh = float(np.sum(p_grid_imp * dt))
        total_export_kwh = float(np.sum(p_grid_exp * dt))
        total_cost_rs = float(np.sum((tariff["import"] * p_grid_imp - tariff["export"] * p_grid_exp) * dt))
        total_co2_kg = float(np.sum(p_grid_imp * dt * CARBON_INTENSITY_GRID))

        # Generate reason codes for each step
        reason_codes = []
        for t in range(n_steps):
            hour = t * 0.25
            is_peak = (18.0 <= hour < 22.0)
            if p_bat_dis[t] > 5.0 and is_peak:
                code = "PEAK_TARIFF_ARBITRAGE_DISCHARGE"
            elif p_bat_ch[t] > 5.0 and inputs["solar_p50"][t] > 80.0:
                code = "SOLAR_SURPLUS_ABSORPTION"
            elif p_bat_ch[t] > 5.0 and hour < 6.0:
                code = "OFF_PEAK_GRID_PRECHARGE"
            elif p_grid_exp[t] > 5.0:
                code = "GREEN_ENERGY_EXPORT"
            elif p_grid_imp[t] > 5.0:
                code = "BASELOAD_GRID_IMPORT"
            else:
                code = "MICROGRID_SELF_CONSUMPTION"
            reason_codes.append(code)

        return {
            "status": "SUCCESS",
            "solve_mode": solve_mode,
            "solve_time_ms": solve_time_ms,
            "n_steps": n_steps,
            "setpoints": {
                "p_bat_ch_kw": p_bat_ch.tolist(),
                "p_bat_dis_kw": p_bat_dis.tolist(),
                "p_grid_imp_kw": p_grid_imp.tolist(),
                "p_grid_exp_kw": p_grid_exp.tolist(),
                "battery_soc_pct": soc.tolist(),
            },
            "forecast_inputs": {
                "solar_p50_kw": inputs["solar_p50"].tolist(),
                "solar_p10_kw": inputs["solar_p10"].tolist(),
                "solar_p90_kw": inputs["solar_p90"].tolist(),
                "wind_p50_kw": inputs["wind_p50"].tolist(),
                "wind_p10_kw": inputs["wind_p10"].tolist(),
                "wind_p90_kw": inputs["wind_p90"].tolist(),
                "demand_p50_kw": inputs["demand_p50"].tolist(),
            },
            "tariff": {
                "import_rate_rs": tariff["import"].tolist(),
                "export_rate_rs": tariff["export"].tolist(),
            },
            "kpis": {
                "total_cost_rs": round(total_cost_rs, 2),
                "total_import_kwh": round(total_import_kwh, 2),
                "total_export_kwh": round(total_export_kwh, 2),
                "total_co2_emissions_kg": round(total_co2_kg, 2),
            },
            "quantile_robustness": risk_info,
            "reason_codes": reason_codes,
        }


# Global optimizer instance
vpp_optimizer = VppOptimizer()


def optimize_microgrid(current_soc: float = 65.0) -> Dict[str, Any]:
    return vpp_optimizer.solve(current_soc=current_soc)


if __name__ == "__main__":
    print("Executing VppOptimizer (Pyomo + HiGHS)...")
    opt_res = optimize_microgrid(current_soc=55.0)
    print(f"Solve Mode: {opt_res['solve_mode']} | Time: {opt_res['solve_time_ms']} ms | Steps: {opt_res['n_steps']}")
    print(f"Total Cost: Rs. {opt_res['kpis']['total_cost_rs']} | CO2: {opt_res['kpis']['total_co2_emissions_kg']} kg")
    print(f"Quantile Risk: {opt_res['quantile_robustness']}")
    print("\nSample Dispatches (Steps 0, 32 [8h], 52 [13h], 76 [19h]):")
    for s in [0, 32, 52, 76]:
        h = s * 0.25
        ch = opt_res['setpoints']['p_bat_ch_kw'][s]
        dis = opt_res['setpoints']['p_bat_dis_kw'][s]
        imp = opt_res['setpoints']['p_grid_imp_kw'][s]
        soc = opt_res['setpoints']['battery_soc_pct'][s]
        code = opt_res['reason_codes'][s]
        print(f"  Hour {h:4.1f} | SoC: {soc:5.1f}% | Bat Ch: {ch:5.1f} kW | Bat Dis: {dis:5.1f} kW | Grid Imp: {imp:5.1f} kW | {code}")
