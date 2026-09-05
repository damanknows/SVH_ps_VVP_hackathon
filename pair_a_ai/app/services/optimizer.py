"""
Optimization Engine for Pair A (services/optimizer.py)
------------------------------------------------------
Solves 15-minute 96-step rolling horizon LP dispatch using Pyomo + HiGHS.
Implements Section A.3 specifications:
- Power balance constraint across 96 steps
- Battery dynamics (0.25h timestep) with Coulombic efficiency
- Reserve margin robust constraints
- Soft-penalty mutual exclusivity relaxation
- Real-time Jinja2 explainability actions
- Fallback heuristic on infeasibility
"""

import time
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
import pyomo.environ as pyo
from pyomo.contrib import appsi

from app.schemas.optimization import OptimizationOutputSchema, ActionItem
from app.schemas.forecast import ForecastSchema, AssetForecast
from app.services.explainer import Explainer
from app.core.config import settings


class VppOptimizer:
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {
            "assets": settings.ASSETS,
            "tariff": settings.TARIFF,
        }
        self.solver = appsi.solvers.Highs()
        self.solver.config.load_solution = False
        for k, v in settings.SOLVER_OPTIONS.items():
            self.solver.highs_options[k] = v
        self.explainer = Explainer()
        self._warmup()

    def _warmup(self):
        """Warm up solver on 96-step index to pre-compile Pyomo APPSI C++ expressions and symbol maps."""
        try:
            now_ts = ["2026-09-05T00:00:00Z"] * settings.HORIZON_STEPS
            dummy_fc = ForecastSchema(
                generated_at="2026-09-05T00:00:00Z",
                horizon_minutes=settings.HORIZON_MINUTES,
                resolution_minutes=settings.RESOLUTION_MINUTES,
                forecasts={
                    asset: AssetForecast(
                        asset_id=asset,
                        timestamps=now_ts,
                        p10_kw=[0.0] * settings.HORIZON_STEPS,
                        p50_kw=[50.0] * settings.HORIZON_STEPS,
                        p90_kw=[100.0] * settings.HORIZON_STEPS,
                    )
                    for asset in ["solar-pv-block-a", "wind-turb-1", "load-academic", "load-hostel"]
                },
            )
            self.solve({"bess_soc_pct": 75.0}, dummy_fc)
        except Exception:
            pass

    def _get_tariff(self, t: int) -> float:
        """Determines tariff rate based on 15-minute timestep."""
        hour = (t * 0.25) % 24
        if 6.0 <= hour < 18.0:
            return self.config["tariff"]["normal_inr_kwh"]
        elif 18.0 <= hour < 22.0:
            return self.config["tariff"]["peak_inr_kwh"]
        return self.config["tariff"]["off_peak_inr_kwh"]

    def _get_tariff_tier_name(self, t: int) -> str:
        hour = (t * 0.25) % 24
        if 6.0 <= hour < 18.0:
            return "Normal"
        elif 18.0 <= hour < 22.0:
            return "Peak"
        return "Off-Peak"

    def solve(self, current_state: dict, forecast: ForecastSchema) -> OptimizationOutputSchema:
        t_start = time.perf_counter()
        m = pyo.ConcreteModel(name="PairA_LP_Optimizer")
        T = range(settings.HORIZON_STEPS)  # 0..95 (15-min steps)
        m.T = pyo.Set(initialize=T)

        # --- PARAMS (From Forecast & State) ---
        solar_p50 = {t: forecast.forecasts["solar-pv-block-a"].p50_kw[t] for t in T}
        solar_p90 = {t: forecast.forecasts["solar-pv-block-a"].p90_kw[t] for t in T}
        wind_p50 = {t: forecast.forecasts["wind-turb-1"].p50_kw[t] for t in T}
        acad_p50 = {t: forecast.forecasts["load-academic"].p50_kw[t] for t in T}
        hostel_p50 = {t: forecast.forecasts["load-hostel"].p50_kw[t] for t in T}
        load_p50 = {t: acad_p50[t] + hostel_p50[t] for t in T}

        tariff_imp = {t: self._get_tariff(t) for t in T}
        tariff_exp = self.config["tariff"]["export_rate_inr_kwh"]

        # Battery parameters
        bess_cfg = self.config["assets"]["bess-main"]
        soc_0 = float(current_state.get("bess_soc_pct", 75.0)) / 100.0
        cap = float(bess_cfg["capacity_kwh"])
        p_max_ch = float(bess_cfg["max_charge_kw"])
        p_max_dis = float(bess_cfg["max_discharge_kw"])
        eta = float(bess_cfg["efficiency"])
        soc_min = float(bess_cfg["min_soc_pct"]) / 100.0
        soc_reserve = float(bess_cfg["reserve_soc_pct"]) / 100.0
        c_deg = float(bess_cfg.get("degradation_cost_inr_kwh", 0.50))

        # --- VARIABLES ---
        m.P_bat_ch = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0.0, p_max_ch))
        m.P_bat_dis = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0.0, p_max_dis))
        m.P_grid_imp = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0.0, 500.0))
        m.P_grid_exp = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(0.0, 200.0))
        m.SoC = pyo.Var(m.T, domain=pyo.NonNegativeReals, bounds=(soc_min, 1.0))
        m.SimulPenalty = pyo.Var(m.T, domain=pyo.NonNegativeReals)

        # --- CONSTRAINTS ---
        # 1. Power Balance
        def power_balance(model, t):
            gen = solar_p50[t] + wind_p50[t]
            return gen + model.P_bat_dis[t] + model.P_grid_imp[t] == load_p50[t] + model.P_bat_ch[t] + model.P_grid_exp[t]

        m.PowerBal = pyo.Constraint(m.T, rule=power_balance)

        # 2. Battery Dynamics (dt = 0.25h)
        def soc_dyn(model, t):
            if t == 0:
                return model.SoC[t] == soc_0 + (eta * model.P_bat_ch[t] - model.P_bat_dis[t] / eta) * 0.25 / cap
            return model.SoC[t] == model.SoC[t - 1] + (eta * model.P_bat_ch[t] - model.P_bat_dis[t] / eta) * 0.25 / cap

        m.SoCDyn = pyo.Constraint(m.T, rule=soc_dyn)

        # 3. Reserve Margin (SoC >= Reserve)
        def reserve_rule(model, t):
            return model.SoC[t] >= soc_reserve

        m.Reserve = pyo.Constraint(m.T, rule=reserve_rule)

        # 4. Mutual Exclusivity (Soft Constraint Relaxation)
        def simul_rule(model, t):
            return model.P_bat_ch[t] + model.P_bat_dis[t] <= p_max_ch + model.SimulPenalty[t]

        m.SimulCon = pyo.Constraint(m.T, rule=simul_rule)

        # --- OBJECTIVE ---
        def obj_rule(model):
            cost = sum(
                tariff_imp[t] * model.P_grid_imp[t] * 0.25
                - tariff_exp * model.P_grid_exp[t] * 0.25
                + c_deg * (model.P_bat_ch[t] + model.P_bat_dis[t]) * 0.25
                + 1000.0 * model.SimulPenalty[t]
                for t in T
            )
            return cost

        m.Obj = pyo.Objective(rule=obj_rule, sense=pyo.minimize)

        # --- SOLVE ---
        try:
            t_solve_start = time.perf_counter()
            results = self.solver.solve(m)
            elapsed_ms = (time.perf_counter() - t_solve_start) * 1000.0
            is_feasible = (results.termination_condition == appsi.base.TerminationCondition.optimal)
            if is_feasible:
                self.solver.load_vars()
            else:
                return self._fallback_heuristic(current_state, forecast)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return self._fallback_heuristic(current_state, forecast)

        # --- PARSE RESULTS ---
        actions: List[ActionItem] = []
        for t in T:
            ts = forecast.forecasts["solar-pv-block-a"].timestamps[t]
            p_ch = float(pyo.value(m.P_bat_ch[t]))
            p_dis = float(pyo.value(m.P_bat_dis[t]))
            p_imp = float(pyo.value(m.P_grid_imp[t]))
            p_exp = float(pyo.value(m.P_grid_exp[t]))
            soc_val = float(pyo.value(m.SoC[t])) * 100.0

            rate = tariff_imp[t]
            tier = self._get_tariff_tier_name(t)

            # Battery Action
            if p_ch > 1.0:
                actions.append(
                    ActionItem(
                        timestamp=ts,
                        asset_id="bess-main",
                        setpoint_kw=round(p_ch, 2),
                        mode="charge",
                        reason=self.explainer.render(
                            "charge", t, p_ch, solar_p90=round(solar_p90[t], 1), tariff=tier, rate=rate
                        ),
                        priority="HIGH",
                    )
                )
            elif p_dis > 1.0:
                actions.append(
                    ActionItem(
                        timestamp=ts,
                        asset_id="bess-main",
                        setpoint_kw=round(-p_dis, 2),
                        mode="discharge",
                        reason=self.explainer.render(
                            "discharge", t, p_dis, rate=rate, load=round(load_p50[t], 1)
                        ),
                        priority="HIGH",
                    )
                )
            else:
                actions.append(
                    ActionItem(
                        timestamp=ts,
                        asset_id="bess-main",
                        setpoint_kw=0.0,
                        mode="idle",
                        reason=self.explainer.render("idle", t, 0.0, soc=round(soc_val, 1)),
                        priority="LOW",
                    )
                )

            # Grid Actions
            if p_imp > 1.0:
                actions.append(
                    ActionItem(
                        timestamp=ts,
                        asset_id="grid-meter",
                        setpoint_kw=round(p_imp, 2),
                        mode="grid_import",
                        reason=self.explainer.render(
                            "grid_import", t, p_imp, solar=round(solar_p50[t], 1), load=round(load_p50[t], 1)
                        ),
                        priority="MEDIUM",
                    )
                )
            elif p_exp > 1.0:
                actions.append(
                    ActionItem(
                        timestamp=ts,
                        asset_id="grid-meter",
                        setpoint_kw=round(p_exp, 2),
                        mode="grid_export",
                        reason=self.explainer.render("grid_export", t, p_exp, rate=tariff_exp),
                        priority="MEDIUM",
                    )
                )

        total_imp_kwh = sum(float(pyo.value(m.P_grid_imp[t])) * 0.25 for t in T)
        total_exp_kwh = sum(float(pyo.value(m.P_grid_exp[t])) * 0.25 for t in T)
        total_cost = float(pyo.value(m.Obj))

        kpis = {
            "projected_grid_import_kwh": round(total_imp_kwh, 2),
            "projected_grid_export_kwh": round(total_exp_kwh, 2),
            "total_cost_inr": round(total_cost, 2),
            "solve_time_ms": round(elapsed_ms, 2),
            "peak_demand_shaved_kw": round(max([float(pyo.value(m.P_bat_dis[t])) for t in T]), 2),
        }

        return OptimizationOutputSchema(
            solved_at=pd.Timestamp.now().isoformat(),
            horizon_steps=settings.HORIZON_STEPS,
            status="optimal",
            actions=actions,
            kpis=kpis,
        )

    def _fallback_heuristic(self, current_state: dict, forecast: ForecastSchema) -> OptimizationOutputSchema:
        """Rule-based heuristic dispatch if LP solver encounters numerical issues."""
        actions: List[ActionItem] = []
        T = range(settings.HORIZON_STEPS)
        cap = float(self.config["assets"]["bess-main"]["capacity_kwh"])
        soc = float(current_state.get("bess_soc_pct", 75.0))

        tot_imp = 0.0
        tot_cost = 0.0

        for t in T:
            ts = forecast.forecasts["solar-pv-block-a"].timestamps[t]
            solar = forecast.forecasts["solar-pv-block-a"].p50_kw[t]
            wind = forecast.forecasts["wind-turb-1"].p50_kw[t]
            load = forecast.forecasts["load-academic"].p50_kw[t] + forecast.forecasts["load-hostel"].p50_kw[t]

            net = (solar + wind) - load
            rate = self._get_tariff(t)

            if net > 0:
                ch = min(net, 50.0)
                soc = min(90.0, soc + (ch * 0.25 / cap) * 100.0)
                actions.append(
                    ActionItem(
                        timestamp=ts,
                        asset_id="bess-main",
                        setpoint_kw=round(ch, 2),
                        mode="charge",
                        reason=f"Fallback rule: Absorbing surplus {ch:.1f} kW",
                        priority="HIGH",
                    )
                )
            else:
                dis = min(-net, 50.0) if soc > 20.0 else 0.0
                soc = max(20.0, soc - (dis * 0.25 / cap) * 100.0)
                imp = max(0.0, -net - dis)
                tot_imp += imp * 0.25
                tot_cost += imp * 0.25 * rate

                if dis > 1.0:
                    actions.append(
                        ActionItem(
                            timestamp=ts,
                            asset_id="bess-main",
                            setpoint_kw=round(-dis, 2),
                            mode="discharge",
                            reason=f"Fallback rule: Discharging {dis:.1f} kW",
                            priority="HIGH",
                        )
                    )
                if imp > 1.0:
                    actions.append(
                        ActionItem(
                            timestamp=ts,
                            asset_id="grid-meter",
                            setpoint_kw=round(imp, 2),
                            mode="grid_import",
                            reason=f"Fallback rule: Grid import {imp:.1f} kW",
                            priority="MEDIUM",
                        )
                    )

        kpis = {
            "projected_grid_import_kwh": round(tot_imp, 2),
            "projected_grid_export_kwh": 0.0,
            "total_cost_inr": round(tot_cost, 2),
            "solve_time_ms": 1.0,
            "peak_demand_shaved_kw": 0.0,
        }

        return OptimizationOutputSchema(
            solved_at=pd.Timestamp.now().isoformat(),
            horizon_steps=settings.HORIZON_STEPS,
            status="fallback",
            actions=actions,
            kpis=kpis,
        )
