"""
Jinja2 Explainer Service for Microgrid Operators
------------------------------------------------
Renders intuitive "Operator Speak" natural language explanations for SCADA actions.
"""

from typing import Dict, Any
import jinja2

TEMPLATES = {
    "charge": "Charge BESS @ {{p}} kW: Solar Surplus (P90={{solar_p90}} kW) + {{tariff}} Tariff (Rs.{{rate}}/kWh)",
    "discharge": "Discharge BESS @ {{p}} kW: Peak Tariff (Rs.{{rate}}/kWh) + Load {{load}} kW",
    "grid_import": "Import Grid @ {{p}} kW: Deficit Cover (Solar {{solar}} kW < Load {{load}} kW)",
    "grid_export": "Export Grid @ {{p}} kW: Surplus Feed-In (Renewables {{solar}} kW > Load {{load}} kW)",
    "idle": "BESS Idle: SoC Sufficient ({{soc}}%) / No Arbitrage",
}


class Explainer:
    def __init__(self):
        self.env = jinja2.Environment()
        self.templates = {k: self.env.from_string(v) for k, v in TEMPLATES.items()}

    def render(self, mode: str, t: int, p: float, **context) -> str:
        ctx = {"p": round(float(p), 1), **context}
        tmpl = self.templates.get(mode, self.env.from_string("Action: {{mode}} @ {{p}} kW"))
        return tmpl.render(**ctx)
