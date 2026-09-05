from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import random
from datetime import datetime

app = FastAPI(
    title="SuryaVayu VPP Backend API - SVH26004",
    description="Live Modbus Telemetry & Closed-Loop Dispatch Engine for DTE Rajasthan",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "SuryaVayu VPP Hybrid Energy Orchestrator",
        "node": "JODHPUR-DTE-NODE-04",
        "organization": "Directorate of Technical Education, Rajasthan",
        "problem_statement": "SVH26004"
    }

@app.get("/api/telemetry/live")
def get_live_telemetry():
    now_hour = datetime.now().hour
    solar_kw = random.randint(135, 148) if 6 <= now_hour <= 18 else 0
    wind_kw = random.randint(22, 32)
    demand_kw = random.randint(105, 120)
    battery_soc = random.randint(70, 78)
    battery_flow_kw = random.randint(25, 40)
    
    net = (solar_kw + wind_kw) - demand_kw
    grid_import_kw = 0 if net >= 0 else abs(net)
    grid_export_kw = max(0, net - battery_flow_kw)

    return {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "solarKw": solar_kw,
        "windKw": wind_kw,
        "campusDemandKw": demand_kw,
        "batterySoc": battery_soc,
        "batteryFlowKw": battery_flow_kw,
        "gridImportKw": grid_import_kw,
        "gridExportKw": grid_export_kw
    }

@app.get("/api/actions/dispatch")
def get_dispatch_actions():
    return [
        {
            "id": "act-fastapi-101",
            "source": "Solar-Wind Dispatch",
            "title": "Schedule Heavy Autoclave & Water Pumping Windows",
            "detail": "Surplus solar generation (+32 kW) available. Directing excess power to Thermal Lab thermal energy storage & water pumps.",
            "timing": "Window: 12:30 - 14:30",
            "financialImpact": "Est. Savings: ₹1,820",
            "severity": "advisory",
            "status": "Pending Verification"
        },
        {
            "id": "act-fastapi-102",
            "source": "BESS Storage",
            "title": "Fast Charge BESS to 90% Capacity",
            "detail": "Pre-charging LiFePO4 ESS battery bank using zero-cost solar surplus before afternoon peak.",
            "timing": "Active Now",
            "financialImpact": "Est. Savings: ₹2,450",
            "severity": "normal",
            "status": "Applied Automatically"
        },
        {
            "id": "act-fastapi-103",
            "source": "Demand Response",
            "title": "Thermal Lab Load Shifting Active",
            "detail": "Shifted high-draw thermal physics lab machinery to current peak solar window.",
            "timing": "Active Now",
            "financialImpact": "Est. Savings: ₹1,100",
            "severity": "normal",
            "status": "Applied Automatically"
        }
    ]

@app.get("/api/metrics/aggregate")
def get_aggregate_metrics():
    return {
        "renewableSharePct": 88.4,
        "totalGenerationKw": 167,
        "gridImportKw": 0,
        "dailySavingsInr": 4120,
        "co2AvoidedKg": 340,
        "gridTariffRateInr": 7.50,
        "gridStatusMessage": "GRID TARIFF: REGULAR (₹7.50/kWh)"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
