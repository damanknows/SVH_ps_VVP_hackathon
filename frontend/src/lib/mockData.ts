import { Campus, CurrentTelemetry, ForecastItem, Recommendation, ScenarioPreset } from "@/types/telemetry";

export const RAJASTHAN_CAMPUSES: Campus[] = [
  {
    id: "gec-bikaner",
    name: "GEC Bikaner - Main Campus",
    city: "Bikaner",
    capacity_kw: 350,
    solar_installed_kw: 220,
    battery_capacity_kwh: 400,
  },
  {
    id: "mbm-jodhpur",
    name: "MBM University - Jodhpur",
    city: "Jodhpur",
    capacity_kw: 500,
    solar_installed_kw: 310,
    battery_capacity_kwh: 600,
  },
  {
    id: "rtu-kota",
    name: "RTU Kota - Technical Campus",
    city: "Kota",
    capacity_kw: 450,
    solar_installed_kw: 250,
    battery_capacity_kwh: 500,
  },
  {
    id: "ctae-udaipur",
    name: "CTAE Udaipur - Green Campus",
    city: "Udaipur",
    capacity_kw: 300,
    solar_installed_kw: 180,
    battery_capacity_kwh: 350,
  },
];

const CAMPUS_FACTORS: Record<string, { solar: number; wind: number; load: number }> = {
  "gec-bikaner": { solar: 1.0, wind: 1.3, load: 1.0 },
  "mbm-jodhpur": { solar: 1.41, wind: 1.05, load: 1.43 },
  "rtu-kota": { solar: 1.14, wind: 0.85, load: 1.28 },
  "ctae-udaipur": { solar: 0.82, wind: 0.95, load: 0.85 },
};

// Helper to generate 24h forecast curve based on scenario and campus
export function generate24hForecast(
  scenario: ScenarioPreset,
  campusId: string = "gec-bikaner"
): ForecastItem[] {
  const items: ForecastItem[] = [];
  const factors = CAMPUS_FACTORS[campusId] ?? CAMPUS_FACTORS["gec-bikaner"];

  for (let h = 0; h < 24; h++) {
    const hourStr = `${h.toString().padStart(2, "0")}:00`;
    const isPeakTariff = h >= 18 && h <= 22; // 6 PM to 10 PM peak tariff in Rajasthan

    let solar_kw = 0;
    let wind_kw = 0;
    let demand_kw = (120 + Math.sin((h - 8) / 3) * 35) * factors.load;

    if (scenario === "SUNNY_PEAK") {
      if (h >= 6 && h <= 18) {
        const solarFactor = Math.sin(((h - 6) / 12) * Math.PI);
        solar_kw = Math.round(210 * factors.solar * Math.pow(solarFactor, 1.2));
      }
      wind_kw = Math.round((20 + (h % 5) * 3) * factors.wind);
    } else if (scenario === "CLOUDY_AFTERNOON") {
      if (h >= 6 && h <= 18) {
        const solarFactor = Math.sin(((h - 6) / 12) * Math.PI);
        const cloudDip = (h >= 12 && h <= 15) ? 0.35 : 0.8;
        solar_kw = Math.round(140 * factors.solar * solarFactor * cloudDip);
      }
      wind_kw = Math.round((35 + (h % 7) * 3) * factors.wind);
    } else if (scenario === "WINDY_NIGHT") {
      if (h >= 7 && h <= 17) {
        solar_kw = Math.round(60 * factors.solar * Math.sin(((h - 7) / 10) * Math.PI));
      }
      wind_kw = Math.round((110 + Math.sin(h / 3) * 25) * factors.wind);
      demand_kw = Math.max(90 * factors.load, demand_kw * 0.85);
    }

    const totalGreen = solar_kw + wind_kw;
    const isSurplus = totalGreen > demand_kw;

    let battery_soc = 50;
    if (h < 6) battery_soc = Math.max(30, 70 - h * 4);
    else if (h >= 11 && h <= 15) battery_soc = Math.min(95, 55 + (h - 10) * 8);
    else if (h >= 18 && h <= 22) battery_soc = Math.max(25, 85 - (h - 17) * 12);
    else battery_soc = 65;

    let grid_import_kw = 0;
    if (totalGreen < demand_kw) {
      grid_import_kw = Math.max(0, Math.round(demand_kw - totalGreen - (isPeakTariff ? 25 : 10)));
    }

    items.push({
      hour: hourStr,
      solar_kw: Math.max(0, solar_kw),
      wind_kw: Math.max(0, wind_kw),
      demand_kw: Math.round(demand_kw),
      battery_soc: Math.round(battery_soc),
      grid_import_kw: Math.round(grid_import_kw),
      is_surplus: isSurplus,
      is_peak_tariff: isPeakTariff,
    });
  }

  return items;
}

// Generate instantaneous telemetry based on scenario, hour, and campus
export function getTelemetryForHour(
  scenario: ScenarioPreset,
  hour: number = 14,
  campusId: string = "gec-bikaner",
  live: boolean = false
): CurrentTelemetry {
  const forecast = generate24hForecast(scenario, campusId);
  const current = forecast[Math.min(23, Math.max(0, hour))];
  const factors = CAMPUS_FACTORS[campusId] ?? CAMPUS_FACTORS["gec-bikaner"];
  const campus = RAJASTHAN_CAMPUSES.find((c) => c.id === campusId) ?? RAJASTHAN_CAMPUSES[0];

  const jitter = live ? (Math.random() * 0.03 - 0.015) : 0;
  const solar_kw = Math.max(0, Math.round(current.solar_kw * (1 + jitter)));
  const wind_kw = Math.max(0, Math.round(current.wind_kw * (1 + jitter)));
  const demand_kw = Math.max(10, Math.round(current.demand_kw * (1 + jitter)));

  const totalGen = solar_kw + wind_kw;
  const netPower = totalGen - demand_kw;

  const maxCharge = Math.round(50 * (campus.battery_capacity_kwh / 400));
  const maxDischarge = Math.round(45 * (campus.battery_capacity_kwh / 400));

  let battery_power_kw = 0;
  let grid_import_kw = 0;
  let grid_export_kw = 0;

  if (netPower > 0) {
    battery_power_kw = Math.min(maxCharge, Math.round(netPower));
    grid_export_kw = Math.max(0, Math.round(netPower - battery_power_kw));
  } else {
    const deficit = Math.abs(netPower);
    battery_power_kw = -Math.min(maxDischarge, Math.round(deficit));
    grid_import_kw = Math.max(0, Math.round(deficit - Math.abs(battery_power_kw)));
  }

  const rupees_saved = Math.round((3800 + hour * 240 + (scenario === "SUNNY_PEAK" ? 850 : 200)) * factors.load);
  const co2_saved_kg = Number(((280 + hour * 18.5 + (scenario === "WINDY_NIGHT" ? 45 : 15)) * factors.load).toFixed(1));

  const now = new Date();
  now.setHours(hour, now.getMinutes(), 0, 0);

  return {
    timestamp: now.toISOString(),
    solar_kw,
    wind_kw,
    demand_kw,
    battery_soc: current.battery_soc,
    battery_power_kw,
    grid_import_kw,
    grid_export_kw,
    co2_saved_kg,
    rupees_saved,
  };
}

// Campus-specific recommendations
export function getRecommendationsForCampus(campusId: string = "gec-bikaner"): Recommendation[] {
  const campus = RAJASTHAN_CAMPUSES.find((c) => c.id === campusId) ?? RAJASTHAN_CAMPUSES[0];
  const factors = CAMPUS_FACTORS[campusId] ?? CAMPUS_FACTORS["gec-bikaner"];

  return [
    {
      id: "rec-1",
      type: "LOAD_SHIFT",
      priority: "HIGH",
      title: `Shift Heavy Workshop Load • ${campus.name}`,
      action: `Schedule CNC milling & heavy electric furnace operation between 12:30 - 15:00 during Solar Surplus Window at ${campus.name}.`,
      financial_impact: `Save ₹${Math.round(1850 * factors.load).toLocaleString()} in peak tariff surcharges`,
      carbon_impact: `${Math.round(54 * factors.load)} kg CO₂ avoided today`,
      status: "PENDING",
    },
    {
      id: "rec-2",
      type: "BATTERY_DISCHARGE",
      priority: "HIGH",
      title: `Pre-Discharge BESS (${campus.battery_capacity_kwh} kWh) for Evening Peak`,
      action: `Discharge BESS into campus microgrid from 18:30 to 21:00 to avoid expensive grid draw.`,
      financial_impact: `Save ₹${Math.round(2400 * factors.load).toLocaleString()} during peak ₹11.5/kWh rate`,
      carbon_impact: `${Math.round(78 * factors.load)} kg CO₂ avoided`,
      status: "PENDING",
    },
    {
      id: "rec-3",
      type: "BATTERY_CHARGE",
      priority: "MEDIUM",
      title: "Pre-Charge Battery Array using Solar Over-Generation",
      action: `Ramp charging rate to +${Math.round(45 * factors.solar)} kW between 11:00 and 14:00 to store excess solar production.`,
      financial_impact: `Utilize ₹${Math.round(950 * factors.solar).toLocaleString()} of zero-cost solar power`,
      carbon_impact: `${Math.round(38 * factors.solar)} kg CO₂ sequestered equivalent`,
      status: "PENDING",
    },
    {
      id: "rec-4",
      type: "CURTAILMENT",
      priority: "LOW",
      title: "Smart HVAC Staggering in Campus Buildings",
      action: "Stagger chiller block startups by 15 minutes to reduce campus peak demand spike.",
      financial_impact: `Reduce maximum demand charge by ₹${Math.round(1120 * factors.load).toLocaleString()}/mo`,
      carbon_impact: `${Math.round(22 * factors.load)} kg CO₂ avoided`,
      status: "PENDING",
    },
  ];
}

export const INITIAL_RECOMMENDATIONS = getRecommendationsForCampus("gec-bikaner");
