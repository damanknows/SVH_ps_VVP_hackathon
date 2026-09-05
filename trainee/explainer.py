"""
AI Microgrid Dispatch Explainer Engine (Jinja2)
-----------------------------------------------
Translates raw mathematical optimization setpoints and probabilistic quantile
forecasts into clear, human-auditable engineering explanations and actionable
SCADA recommendations.
"""

from typing import Dict, Any, List
import numpy as np
from jinja2 import Template

# Jinja2 Templates for Dispatch Rationales
CHARGE_TEMPLATE = Template(
    "Charge BESS @ {{ p }} kW: {{ reason }} (Solar P90={{ p90 }} kW, ToD Tariff=Rs.{{ tariff }}/kWh)"
)

DISCHARGE_TEMPLATE = Template(
    "Discharge BESS @ {{ p }} kW: Peak Tariff Arbitrage (ToD Tariff=Rs.{{ tariff }}/kWh, avoiding grid peak surcharge)"
)

EXPORT_TEMPLATE = Template(
    "Export Surplus @ {{ p }} kW: Microgrid generation ({{ total_gen }} kW) exceeds campus demand ({{ demand }} kW) @ Rs.{{ tariff }}/kWh feed-in"
)

IMPORT_TEMPLATE = Template(
    "Import Grid @ {{ p }} kW: Meeting residual baseload (Demand={{ demand }} kW, Renewables={{ total_gen }} kW) @ Rs.{{ tariff }}/kWh"
)

QUANTILE_ALERT_TEMPLATE = Template(
    "Quantile Risk Hedging: P10 worst-case solar deficit is {{ deficit_kwh }} kWh (minimum projected SoC {{ worst_soc }}%). Conservative reserve enforced."
)


def explain_step(opt_result: Dict[str, Any], step_idx: int) -> str:
    """
    Generates a single human-readable explanation sentence for a specific 15-minute step.
    """
    sp = opt_result["setpoints"]
    fc = opt_result["forecast_inputs"]
    tf = opt_result["tariff"]

    p_ch = sp["p_bat_ch_kw"][step_idx]
    p_dis = sp["p_bat_dis_kw"][step_idx]
    p_imp = sp["p_grid_imp_kw"][step_idx]
    p_exp = sp["p_grid_exp_kw"][step_idx]
    tariff_imp = tf["import_rate_rs"][step_idx]
    tariff_exp = tf["export_rate_rs"][step_idx]

    solar_p50 = fc["solar_p50_kw"][step_idx]
    solar_p90 = fc["solar_p90_kw"][step_idx]
    wind_p50 = fc["wind_p50_kw"][step_idx]
    demand_p50 = fc["demand_p50_kw"][step_idx]
    total_gen = round(solar_p50 + wind_p50, 1)

    if p_ch > 5.0:
        reason = "Solar Absorption" if solar_p50 > 80 else "Off-Peak Tariff Arbitrage"
        return CHARGE_TEMPLATE.render(p=round(p_ch, 1), reason=reason, p90=round(solar_p90, 1), tariff=tariff_imp)
    elif p_dis > 5.0:
        return DISCHARGE_TEMPLATE.render(p=round(p_dis, 1), tariff=tariff_imp)
    elif p_exp > 5.0:
        return EXPORT_TEMPLATE.render(p=round(p_exp, 1), total_gen=total_gen, demand=round(demand_p50, 1), tariff=tariff_exp)
    elif p_imp > 5.0:
        return IMPORT_TEMPLATE.render(p=round(p_imp, 1), total_gen=total_gen, demand=round(demand_p50, 1), tariff=tariff_imp)
    else:
        return f"Microgrid Equilibrium: Renewables ({total_gen} kW) exactly balance campus load ({demand_p50} kW)."


def generate_executive_recommendations(opt_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extracts high-priority recommendations with financial and carbon impact metrics
    directly aligned with the Pair B (backend) and Pair C (frontend) contract.
    """
    sp = opt_result["setpoints"]
    tf = opt_result["tariff"]
    fc = opt_result["forecast_inputs"]
    risk = opt_result.get("quantile_robustness", {})

    recs = []

    # 1. Solar Absorption Peak
    ch_arr = np.array(sp["p_bat_ch_kw"])
    if np.max(ch_arr) > 10.0:
        peak_ch_step = int(np.argmax(ch_arr))
        peak_ch_hour = peak_ch_step * 0.25
        recs.append({
            "id": "rec-solar-bess",
            "type": "BATTERY_CHARGE",
            "priority": "HIGH",
            "title": f"Charge BESS During Solar Window ({peak_ch_hour:02.0f}:00)",
            "action": explain_step(opt_result, peak_ch_step),
            "financial_impact": f"Absorbs zero-cost campus solar generation",
            "carbon_impact": "Direct zero-emission renewable storage",
            "status": "ACTIVE",
        })

    # 2. Evening Peak Discharge
    dis_arr = np.array(sp["p_bat_dis_kw"])
    if np.max(dis_arr) > 10.0:
        peak_dis_step = int(np.argmax(dis_arr))
        peak_dis_hour = peak_dis_step * 0.25
        recs.append({
            "id": "rec-peak-discharge",
            "type": "BATTERY_DISCHARGE",
            "priority": "HIGH",
            "title": f"Arbitrage Discharge During Peak Tariff ({peak_dis_hour:02.0f}:00)",
            "action": explain_step(opt_result, peak_dis_step),
            "financial_impact": f"Avoids Rs.{tf['import_rate_rs'][peak_dis_step]}/kWh peak grid surcharge",
            "carbon_impact": "Displaces high-carbon grid peaker generation",
            "status": "ACTIVE",
        })

    # 3. Quantile Risk Recommendation (Closed-Loop Actuator)
    if risk.get("risk_detected", False):
        if risk.get("reoptimization_performed", False):
            action_text = (
                f"Quantile Risk Closed-Loop Hedge: P10 solar deficit is {risk.get('solar_p10_deficit_kwh', 0)} kWh. "
                f"Dynamically tightened reserve margin to {risk.get('hedged_reserve_margin', 0)}% and pre-charged "
                f"{risk.get('preemptive_charging_kwh', 0)} kWh during off-peak windows."
            )
            title_text = "Closed-Loop Quantile Uncertainty Hedge Active"
            priority_val = "HIGH"
        else:
            action_text = QUANTILE_ALERT_TEMPLATE.render(
                deficit_kwh=risk.get("solar_p10_deficit_kwh", 0),
                worst_soc=risk.get("min_worst_case_soc", 0),
            )
            title_text = "Quantile Uncertainty Hedge Active"
            priority_val = "MEDIUM"

        recs.append({
            "id": "rec-quantile-hedging",
            "type": "QUANTILE_RISK_HEDGE",
            "priority": priority_val,
            "title": title_text,
            "action": action_text,
            "financial_impact": "Prevents emergency diesel generator / unserved load penalty",
            "carbon_impact": "Guarantees continuity under severe cloud attenuation",
            "status": "ACTIVE",
        })

    # 4. HVAC / Load Balancing
    recs.append({
        "id": "rec-smart-hvac",
        "type": "LOAD_MANAGEMENT",
        "priority": "LOW",
        "title": "Optimal Campus Energy Balance",
        "action": f"Total 24h expected energy cost: Rs.{opt_result['kpis']['total_cost_rs']} | Carbon footprint: {opt_result['kpis']['total_co2_emissions_kg']} kg CO2",
        "financial_impact": f"Optimized across 96 15-min intervals",
        "carbon_impact": f"{opt_result['kpis']['total_co2_emissions_kg']} kg CO2 lifecycle total",
        "status": "COMPLETED",
    })

    return recs


if __name__ == "__main__":
    import numpy as np
    from optimizer import optimize_microgrid
    print("Testing AI Explainer Engine...")
    opt = optimize_microgrid(current_soc=65.0)
    print("\nSample Step Explanations:")
    for step in [0, 32, 52, 76]:
        print(f"  Step {step:2d} ({step*0.25:4.1f}h): {explain_step(opt, step)}")
    print("\nExecutive Recommendations Preview:")
    recs = generate_executive_recommendations(opt)
    for r in recs:
        print(f"  [{r['priority']}] {r['title']}: {r['action']}")
