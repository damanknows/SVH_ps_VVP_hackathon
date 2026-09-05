"""
Explainer Service
-----------------
Provides Jinja2 templated natural-language explanations for microgrid dispatch setpoints.
"""

from typing import Dict, Any
import jinja2

TEMPLATES = {
    "charge": "Charge BESS @ {{p}} kW: Solar Surplus (P90={{solar_p90}} kW) + {{tariff}} Tariff (INR {{rate}}/kWh)",
    "discharge": "Discharge BESS @ {{p}} kW: Peak Tariff (INR {{rate}}/kWh) + Load {{load}} kW",
    "grid_import": "Import Grid @ {{p}} kW: Deficit Cover (Solar {{solar}} kW < Load {{load}} kW)",
    "grid_export": "Export Grid @ {{p}} kW: Clean Renewable Excess Feed-in @ INR {{rate}}/kWh",
    "idle": "BESS Idle: SoC Sufficient ({{soc}}%) / No Arbitrage Window"
}


class Explainer:
    def __init__(self):
        self.env = jinja2.Environment(autoescape=False, trim_blocks=True, lstrip_blocks=True)
        self.templates = {k: self.env.from_string(v) for k, v in TEMPLATES.items()}
        self._default_template = self.env.from_string("Action: {{mode}} @ {{p}} kW")

    def render(self, mode: str, t: int, p: float, **context) -> str:
        ctx = {"p": round(p, 1), "t": t, "mode": mode, **context}
        template = self.templates.get(mode, self._default_template)
        return template.render(**ctx)
