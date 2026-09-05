"""
Pair A Optimization Engine (Pyomo + HiGHS)
------------------------------------------
Implements the 96-step Deterministic LP dispatch with Robust Reserve Margin
and Jinja2-rendered ActionItems.
"""

from typing import Dict, Any, List, Optional
import time
import numpy as np
import pandas as pd
import pyomo.environ as pyo

from app.core.config import settings
from app.schemas.optimization import OptimizationOutputSchema, ActionItem
from app.schemas.forecast import ForecastSchema
from app.services.explainer import Explainer


class VppOptimizer:
    def __init__(self, config: Optional[dict] = None):
        self.config = config or settings.DEFAULT_CONFIG
        self.solver = pyo.SolverFactory("appsi_highs")
        if not self.solver.available():
            self.solver = pyo.SolverFactory("highs")
        self.explainer = Explainer()
        self.last_soc: Optional[List[float]] = None

    def _get_tariff(self, t: int) -> float:
        hour = t * 0.25
        if 18.0 <= hour < 22.0:
            return float(self.config["tariff"]["peak_rate_inr_kwh"])
        elif hour >= 22.0 or hour < 6.0:
            return float(self.config["tariff"]["offpeak_rate_inr_kwh"])
        else:
            return float(self.config["tariff"]["normal_rate_inr_kwh"])

    def _fallback_heuristic(self, current_state: dict, forecast: ForecastSchema) -> OptimizationOutputSchema:
        """Emergency Plan: Direct grid import to cover deficits safely with zero BESS wear."""
        T = range(96)
        actions = []
        timestamps = forecast.forecasts["solar-pv-block-a"].timestamps
        soc_val = current_state.get("bess_soc_pct", 50.0)

        total_imp_kwh = 0.0
        total_exp_kwh = 0.0
        total_cost = 0.0

        for t in T:
            ts = timestamps[t]
            solar = forecast.forecasts["solar-pv-block-a"].p50_kw[t]
            wind = forecast.forecasts["wind-turb-1"].p50_kw[t]
            acad = forecast.forecasts["load-academic"].p50_kw[t]
            hostel = forecast.forecasts["load-hostel"].p50_kw[t]
            load = acad + hostel
            net = (solar + wind) - load

            tariff_imp = self._get_tariff(t)
            tariff_exp = float(self.config["tariff"]["export_rate_inr_kwh"])

            if net < 0:
                p_imp = abs(net)
                total_imp_kwh += p_imp * 0.25
                total_cost += p_imp * 0.25 * tariff_imp
                actions.append(ActionItem(
                    timestamp=ts,
                    asset_id="grid-interconnect",
                    setpoint_kw=round(p_imp, 1),
                    mode="grid_import",
                    reason=self.explainer.render("grid_import", t, p_imp, solar=round(solar + wind, 1), load=round(load, 1), rate=tariff_imp),
                    priority="HIGH",
                ))
            else:
                p_exp = net
                total_exp_kwh += p_exp * 0.25
                total_cost -= p_exp * 0.25 * tariff_exp
                if p_exp > 1.0:
                    actions.append(ActionItem(
                        timestamp=ts,
                        asset_id="grid-interconnect",
                        setpoint_kw=round(p_exp, 1),
                        mode="grid_export",
                        reason=self.explainer.render("grid_export", t, p_exp, solar=round(solar + wind, 1), load=round(load, 1), rate=tariff_exp),
                        priority="LOW",
                    ))

        return OptimizationOutputSchema(
            solved_at=pd.Timestamp.now().isoformat(),
            horizon_steps=96,
            status="emergency_fallback",
            actions=actions,
            kpis={
                "projected_grid_import_kwh": round(total_imp_kwh, 2),
                "projected_grid_export_kwh": round(total_exp_kwh, 2),
                "total_cost_inr": round(total_cost, 2),
                "total_co2_kg": round(total_imp_kwh * 0.82, 2),
            },
        )

    def _build_model(self, current_state: dict, forecast: ForecastSchema, soc_reserve: float) -> pyo.ConcreteModel:
        m = pyo.ConcreteModel()
        T = range(96)
        m.T = pyo.Set(initialize=T)

        # --- PARAMS ---
        solar_p50 = {t: forecast.forecasts["solar-pv-block-a"].p50_kw[t] for t in T}
        wind_p50 = {t: forecast.forecasts["wind-turb-1"].p50_kw[t] for t in T}
        load_p50 = {
            t: (forecast.forecasts["load-academic"].p50_kw[t] + forecast.forecasts["load-hostel"].p50_kw[t])
            for t in T
        }

        tariff_imp = {t: self._get_tariff(t) for t in T}
        tariff_exp = float(self.config["tariff"]["export_rate_inr_kwh"])

        # Battery Config
        soc_0 = float(current_state.get("bess_soc_pct", 65.0)) / 100.0
        cap = float(self.config["assets"]["bess-main"]["capacity_kwh"])
        p_max_ch = float(self.config["assets"]["bess-main"]["max_charge_kw"])
        p_max_dis = float(self.config["assets"]["bess-main"]["max_discharge_kw"])
        eta = float(self.config["assets"]["bess-main"]["efficiency"])
        soc_min = float(self.config["assets"]["bess-main"]["min_soc_pct"]) / 100.0

        # --- VARS ---
        m.P_bat_ch = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0, p_max_ch))
        m.P_bat_dis = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0, p_max_dis))
        m.P_grid_imp = pyo.Var(m.T, domain=pyo.NonNegativeReals)
        m.P_grid_exp = pyo.Var(m.T, domain=pyo.NonNegativeReals)
        m.SoC = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(soc_min, 1.0))
        m.SimulPenalty = pyo.Var(m.T, domain=pyo.NonNegativeReals)
        m.SlackMargin = pyo.Var(m.T, domain=pyo.NonNegativeReals)

        # --- CONSTRAINTS ---
        # 1. Power Balance
        def power_balance(model, t):
            gen = solar_p50[t] + wind_p50[t]
            return gen + model.P_bat_dis[t] + model.P_grid_imp[t] == load_p50[t] + model.P_bat_ch[t] + model.P_grid_exp[t]

        m.PowerBal = pyo.Constraint(m.T, rule=power_balance)

        # 2. Battery Dynamics (0.25h)
        def soc_dyn(model, t):
            delta = (eta * model.P_bat_ch[t] - model.P_bat_dis[t] / eta) * 0.25 / cap
            if t == 0:
                return model.SoC[t] == soc_0 + delta
            return model.SoC[t] == model.SoC[t - 1] + delta

        m.SoCDyn = pyo.Constraint(m.T, rule=soc_dyn)

        # 3. Reserve Margin (Soft constraint with slack penalty to guarantee LP feasibility)
        def reserve_rule(model, t):
            return model.SoC[t] + model.SlackMargin[t] >= soc_reserve

        m.Reserve = pyo.Constraint(m.T, rule=reserve_rule)

        # 4. Mutual Exclusivity (Soft Constraint)
        def simul_rule(model, t):
            return model.P_bat_ch[t] + model.P_bat_dis[t] <= p_max_ch + model.SimulPenalty[t]

        m.SimulCon = pyo.Constraint(m.T, rule=simul_rule)

        # --- OBJECTIVE ---
        def obj_rule(model):
            cost = sum(
                tariff_imp[t] * model.P_grid_imp[t] * 0.25
                - tariff_exp * model.P_grid_exp[t] * 0.25
                + 0.40 * (model.P_bat_ch[t] + model.P_bat_dis[t]) * 0.25  # Degradation ₹/kWh
                + 1000.0 * model.SimulPenalty[t]
                + 500.0 * model.SlackMargin[t]
                for t in T
            )
            return cost

        m.Obj = pyo.Objective(rule=obj_rule, sense=pyo.minimize)

        # Warm start seeding
        if self.last_soc is not None and len(self.last_soc) == 96:
            for t in T:
                m.SoC[t].value = self.last_soc[t]

        return m

    def solve(self, current_state: dict, forecast: ForecastSchema) -> OptimizationOutputSchema:
        t_start = time.time()
        T = range(96)

        cap = float(self.config["assets"]["bess-main"]["capacity_kwh"])
        soc_reserve_base = float(self.config["assets"]["bess-main"]["reserve_soc_pct"]) / 100.0
        tariff_exp = float(self.config["tariff"]["export_rate_inr_kwh"])
        tariff_imp = {t: self._get_tariff(t) for t in T}

        solar_p50 = {t: forecast.forecasts["solar-pv-block-a"].p50_kw[t] for t in T}
        wind_p50 = {t: forecast.forecasts["wind-turb-1"].p50_kw[t] for t in T}
        load_p50 = {
            t: (forecast.forecasts["load-academic"].p50_kw[t] + forecast.forecasts["load-hostel"].p50_kw[t])
            for t in T
        }

        # Build initial Pyomo model
        m = self._build_model(current_state, forecast, soc_reserve=soc_reserve_base)

        # --- SOLVE ---
        try:
            results = self.solver.solve(m, tee=False)
            status_ok = (results.solver.status == pyo.SolverStatus.ok) and (
                results.solver.termination_condition
                in [pyo.TerminationCondition.optimal, pyo.TerminationCondition.feasible]
            )
            if not status_ok:
                return self._fallback_heuristic(current_state, forecast)
        except Exception:
            return self._fallback_heuristic(current_state, forecast)

        # Initial extraction
        p_bat_ch_arr = [round(pyo.value(m.P_bat_ch[t]), 2) for t in T]
        p_bat_dis_arr = [round(pyo.value(m.P_bat_dis[t]), 2) for t in T]
        p_grid_imp_arr = [round(pyo.value(m.P_grid_imp[t]), 2) for t in T]
        p_grid_exp_arr = [round(pyo.value(m.P_grid_exp[t]), 2) for t in T]
        soc_arr = [round(pyo.value(m.SoC[t]) * 100.0, 2) for t in T]

        # Quantile Risk Check
        solar_p10 = forecast.forecasts["solar-pv-block-a"].p10_kw
        solar_p50_list = [solar_p50[t] for t in T]
        deficit_kwh = sum(max(0.0, solar_p50_list[t] - solar_p10[t]) * 0.25 for t in T)
        worst_soc = min(soc_arr) - (deficit_kwh / cap) * 100.0
        risk_detected = worst_soc < (soc_reserve_base * 100.0 * 0.90)

        reoptimization_performed = False
        hedged_reserve_margin = None
        preemptive_charging_kwh = 0.0
        p_bat_ch_base = list(p_bat_ch_arr)

        # CLOSED-LOOP QUANTILE RE-OPTIMIZATION ACTUATOR:
        # If P10 solar shortfall threatens reserve margin, tighten reserve and re-solve LP
        if risk_detected:
            soc_deficit_pct = max(0.0, (soc_reserve_base * 100.0) - worst_soc)
            tightened_reserve_pct = min(85.0, round((soc_reserve_base * 100.0) + soc_deficit_pct + 2.5, 1))
            m_hedged = self._build_model(current_state, forecast, soc_reserve=tightened_reserve_pct / 100.0)
            try:
                res_hedged = self.solver.solve(m_hedged, tee=False)
                if (res_hedged.solver.status == pyo.SolverStatus.ok) and (
                    res_hedged.solver.termination_condition
                    in [pyo.TerminationCondition.optimal, pyo.TerminationCondition.feasible]
                ):
                    p_bat_ch_arr = [round(pyo.value(m_hedged.P_bat_ch[t]), 2) for t in T]
                    p_bat_dis_arr = [round(pyo.value(m_hedged.P_bat_dis[t]), 2) for t in T]
                    p_grid_imp_arr = [round(pyo.value(m_hedged.P_grid_imp[t]), 2) for t in T]
                    p_grid_exp_arr = [round(pyo.value(m_hedged.P_grid_exp[t]), 2) for t in T]
                    soc_arr = [round(pyo.value(m_hedged.SoC[t]) * 100.0, 2) for t in T]
                    m = m_hedged
                    reoptimization_performed = True
                    hedged_reserve_margin = tightened_reserve_pct
                    preemptive_charging_kwh = round(
                        sum(max(0.0, p_bat_ch_arr[t] - p_bat_ch_base[t]) * 0.25 for t in T), 2
                    )
            except Exception:
                pass

        # --- PARSE RESULTS & ACTIONS ---
        actions = []
        timestamps = forecast.forecasts["solar-pv-block-a"].timestamps
        solar_p90 = forecast.forecasts["solar-pv-block-a"].p90_kw

        for t in T:
            ts = timestamps[t]
            p_ch = p_bat_ch_arr[t]
            p_dis = p_bat_dis_arr[t]
            p_imp = p_grid_imp_arr[t]
            p_exp = p_grid_exp_arr[t]

            tariff_str = "Peak" if (18.0 <= t * 0.25 < 22.0) else ("Off-Peak" if (t * 0.25 < 6.0 or t * 0.25 >= 22.0) else "Normal")

            if p_ch > 1.0:
                if reoptimization_performed and p_ch > (p_bat_ch_base[t] + 1.0):
                    reason = f"Preemptive BESS Charge @ {p_ch} kW: Quantile Hedging (Reserve tightened to {hedged_reserve_margin}%)"
                else:
                    reason = self.explainer.render("charge", t, p_ch, solar_p90=round(solar_p90[t], 1), tariff=tariff_str, rate=tariff_imp[t])
                actions.append(ActionItem(
                    timestamp=ts,
                    asset_id="bess-main",
                    setpoint_kw=round(p_ch, 1),
                    mode="charge",
                    reason=reason,
                    priority="HIGH",
                ))
            elif p_dis > 1.0:
                actions.append(ActionItem(
                    timestamp=ts,
                    asset_id="bess-main",
                    setpoint_kw=-round(p_dis, 1),
                    mode="discharge",
                    reason=self.explainer.render("discharge", t, p_dis, rate=tariff_imp[t], load=round(load_p50[t], 1)),
                    priority="HIGH",
                ))

            if p_imp > 1.0:
                actions.append(ActionItem(
                    timestamp=ts,
                    asset_id="grid-interconnect",
                    setpoint_kw=round(p_imp, 1),
                    mode="grid_import",
                    reason=self.explainer.render("grid_import", t, p_imp, solar=round(solar_p50[t] + wind_p50[t], 1), load=round(load_p50[t], 1)),
                    priority="MEDIUM",
                ))
            elif p_exp > 1.0:
                actions.append(ActionItem(
                    timestamp=ts,
                    asset_id="grid-interconnect",
                    setpoint_kw=round(p_exp, 1),
                    mode="grid_export",
                    reason=self.explainer.render("grid_export", t, p_exp, solar=round(solar_p50[t] + wind_p50[t], 1), load=round(load_p50[t], 1), rate=tariff_exp),
                    priority="LOW",
                ))

        self.last_soc = [pyo.value(m.SoC[t]) for t in T]

        total_imp_kwh = sum(p_grid_imp_arr) * 0.25
        total_exp_kwh = sum(p_grid_exp_arr) * 0.25
        total_cost = sum(tariff_imp[t] * p_grid_imp_arr[t] * 0.25 - tariff_exp * p_grid_exp_arr[t] * 0.25 for t in T)

        return OptimizationOutputSchema(
            solved_at=pd.Timestamp.now().isoformat(),
            horizon_steps=96,
            status="optimal",
            actions=actions,
            kpis={
                "projected_grid_import_kwh": round(total_imp_kwh, 2),
                "projected_grid_export_kwh": round(total_exp_kwh, 2),
                "total_cost_inr": round(total_cost, 2),
                "total_co2_kg": round(total_imp_kwh * 0.82, 2),
                "solve_time_ms": round((time.time() - t_start) * 1000.0, 2),
            },
            setpoints={
                "p_bat_ch_kw": p_bat_ch_arr,
                "p_bat_dis_kw": p_bat_dis_arr,
                "p_grid_imp_kw": p_grid_imp_arr,
                "p_grid_exp_kw": p_grid_exp_arr,
                "battery_soc_pct": soc_arr,
            },
            quantile_robustness={
                "solar_p10_deficit_kwh": round(deficit_kwh, 2),
                "min_projected_worst_soc": round(worst_soc, 2),
                "risk_detected": risk_detected,
                "reoptimization_performed": reoptimization_performed,
                "hedged_reserve_margin": hedged_reserve_margin,
                "preemptive_charging_kwh": preemptive_charging_kwh,
            },
        )


# Global optimizer instance
vpp_optimizer = VppOptimizer()
