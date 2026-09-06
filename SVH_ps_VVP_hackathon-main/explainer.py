"""
Microgrid Dispatch Explainability & Recommendation Engine
---------------------------------------------------------
Generates operator-interpretable narrative explanations and actionable recommendations
per dispatch timestep using Jinja2 templates.
Directly aligns with frontend RecommendationsPanel data contract:
    {
        "action": str,
        "reason": str,
        "est_savings_rupees": float,
        "est_co2_kg": float
    }
"""

import os
from typing import Dict, List, Any, Optional
import jinja2
from schemas.optimization_schema import Recommendation, DispatchSetpoint

# Jinja2 templates for timestep dispatch rationale
TIMESTEP_TEMPLATE_STR = """
{% if action == 'CHARGE' %}
Charging battery at {{ p_bat_ch }} kW during {{ tariff_tier }} window (INR {{ tariff_rate }}/kWh)
{%- if solar_surplus > 5.0 %} absorbing {{ solar_surplus }} kW solar surplus to avoid curtailment.{% else %} pre-charging for upcoming peak tariff arbitrage.{% endif %}
{% elif action == 'DISCHARGE' %}
Discharging {{ p_bat_dis }} kW from battery to offset campus load during {{ tariff_tier }} tariff (INR {{ tariff_rate }}/kWh), reducing grid import costs.
{% elif action == 'IMPORT' %}
Importing {{ p_grid_imp }} kW from grid at INR {{ tariff_rate }}/kWh to balance campus deficit.
{% elif action == 'EXPORT' %}
Exporting {{ p_grid_exp }} kW renewable excess to utility grid at INR {{ export_rate }}/kWh feed-in tariff.
{% else %}
Holding battery at {{ battery_soc_pct }}% SoC ({{ battery_soc_kwh }} kWh) to preserve reserve margin.
{% endif %}
""".strip()

jinja_env = jinja2.Environment(autoescape=False, trim_blocks=True, lstrip_blocks=True)
timestep_template = jinja_env.from_string(TIMESTEP_TEMPLATE_STR)


def get_tariff_tier(hour: int) -> tuple[str, float]:
    h = hour % 24
    if 6 <= h < 18:
        return "Normal", 7.55
    elif 18 <= h < 22:
        return "Peak", 8.68
    return "Off-Peak", 6.42


class DispatchExplainer:
    """
    Analyzes optimizer outputs and generates explainable narratives and recommendations.
    """

    def __init__(self, battery_capacity_kwh: float = 200.0, export_rate: float = 3.50):
        self.battery_capacity_kwh = battery_capacity_kwh
        self.export_rate = export_rate

    def explain_timestep(
        self,
        hour: int,
        p_ch: float,
        p_dis: float,
        p_imp: float,
        p_exp: float,
        soc_kwh: float,
        solar_kw: float = 0.0,
        load_kw: float = 0.0,
    ) -> tuple[str, str]:
        """
        Returns (action_type, human_readable_reason) for a specific timestep.
        """
        tier_name, tariff_rate = get_tariff_tier(hour)
        soc_pct = round((soc_kwh / self.battery_capacity_kwh) * 100.0, 1)
        solar_surplus = max(0.0, round(solar_kw - load_kw, 1))

        if p_ch > 1.0:
            action = "CHARGE"
        elif p_dis > 1.0:
            action = "DISCHARGE"
        elif p_exp > 1.0:
            action = "EXPORT"
        elif p_imp > 5.0:
            action = "IMPORT"
        else:
            action = "IDLE"

        context = {
            "action": action,
            "hour": hour,
            "p_bat_ch": round(p_ch, 1),
            "p_bat_dis": round(p_dis, 1),
            "p_grid_imp": round(p_imp, 1),
            "p_grid_exp": round(p_exp, 1),
            "battery_soc_kwh": round(soc_kwh, 1),
            "battery_soc_pct": soc_pct,
            "tariff_tier": tier_name,
            "tariff_rate": tariff_rate,
            "export_rate": self.export_rate,
            "solar_surplus": solar_surplus,
        }

        reason = timestep_template.render(context)
        return action, reason

    def build_schedule_and_recommendations(
        self,
        schedule_data: Dict[str, List[float]],
        solar_kw: List[float],
        demand_kw: List[float],
        start_hour: int = 0,
        timestamps: Optional[List[str]] = None,
    ) -> tuple[List[DispatchSetpoint], List[Recommendation]]:
        """
        Creates validated DispatchSetpoint instances and high-level operator Recommendations.
        """
        p_ch = schedule_data["p_bat_ch"]
        p_dis = schedule_data["p_bat_dis"]
        p_imp = schedule_data["p_grid_imp"]
        p_exp = schedule_data["p_grid_exp"]
        soc = schedule_data["soc"]

        N = len(p_ch)
        setpoints: List[DispatchSetpoint] = []

        total_discharged_kwh = sum(p_dis)
        total_charged_kwh = sum(p_ch)
        total_exported_kwh = sum(p_exp)

        for t in range(N):
            h = (start_hour + t) % 24
            sol = solar_kw[t] if t < len(solar_kw) else 0.0
            dem = demand_kw[t] if t < len(demand_kw) else 0.0
            ts = timestamps[t] if timestamps and t < len(timestamps) else None

            action, reason = self.explain_timestep(
                hour=h,
                p_ch=p_ch[t],
                p_dis=p_dis[t],
                p_imp=p_imp[t],
                p_exp=p_exp[t],
                soc_kwh=soc[t],
                solar_kw=sol,
                load_kw=dem,
            )

            soc_pct = min(100.0, max(0.0, (soc[t] / self.battery_capacity_kwh) * 100.0))

            setpoints.append(
                DispatchSetpoint(
                    hour=t,
                    timestamp=ts,
                    p_battery_charge_kw=round(p_ch[t], 2),
                    p_battery_discharge_kw=round(p_dis[t], 2),
                    p_grid_import_kw=round(p_imp[t], 2),
                    p_grid_export_kw=round(p_exp[t], 2),
                    battery_soc_kwh=round(soc[t], 2),
                    battery_soc_pct=round(soc_pct, 2),
                    action=action,
                    reason=reason,
                )
            )

        # Build high-level recommendations matching frontend RecommendationsPanel
        recommendations: List[Recommendation] = []

        # 1. Peak Shaving Recommendation
        if total_discharged_kwh > 5.0:
            peak_savings = total_discharged_kwh * (8.68 - 6.42)
            co2_saved = total_discharged_kwh * 0.81
            recommendations.append(
                Recommendation(
                    action="DISCHARGE_PEAK",
                    reason=f"Discharge up to {max(p_dis):.1f} kW during evening peak hours (18:00-22:00) to shave grid tariff from INR 8.68 to INR 6.42/kWh.",
                    est_savings_rupees=round(peak_savings, 2),
                    est_co2_kg=round(co2_saved, 2),
                )
            )

        # 2. Solar Absorption Recommendation
        if total_charged_kwh > 5.0:
            solar_savings = total_charged_kwh * (7.55 - 3.50)
            recommendations.append(
                Recommendation(
                    action="ABSORB_SOLAR",
                    reason=f"Charge battery at up to {max(p_ch):.1f} kW using midday solar generation, displacing costly grid imports later.",
                    est_savings_rupees=round(solar_savings, 2),
                    est_co2_kg=round(total_charged_kwh * 0.81, 2),
                )
            )

        # 3. Grid Export Arbitrage
        if total_exported_kwh > 10.0:
            export_revenue = total_exported_kwh * self.export_rate
            recommendations.append(
                Recommendation(
                    action="EXPORT_GRID",
                    reason=f"Export {total_exported_kwh:.1f} kWh of excess renewable generation to Rajasthan grid at INR {self.export_rate}/kWh.",
                    est_savings_rupees=round(export_revenue, 2),
                    est_co2_kg=round(total_exported_kwh * 0.81, 2),
                )
            )

        if not recommendations:
            recommendations.append(
                Recommendation(
                    action="HOLD",
                    reason="Maintain standard economic dispatch and reserve margin protection.",
                    est_savings_rupees=0.0,
                    est_co2_kg=0.0,
                )
            )

        return setpoints, recommendations
