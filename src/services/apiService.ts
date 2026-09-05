import { TelemetryPoint, DispatchAction, ForecastDataPoint, CampusTelemetrySummary, ScenarioId, AggregateMetrics } from '../types/energy';

export const mockCampuses: CampusTelemetrySummary[] = [
  {
    campusId: 'dte-jodhpur',
    campusName: 'MBM University & DTE Campus, Jodhpur',
    location: 'Jodhpur, Rajasthan',
    solarCapacityKw: 350,
    windCapacityKw: 100,
    batteryCapacityKwh: 250,
    currentRenewableSharePct: 86.4,
    gridStatus: 'NORMAL'
  },
  {
    campusId: 'mnit-jaipur',
    campusName: 'MNIT Jaipur (Malaviya National Inst. of Tech.)',
    location: 'Jaipur, Rajasthan',
    solarCapacityKw: 500,
    windCapacityKw: 150,
    batteryCapacityKwh: 400,
    currentRenewableSharePct: 94.8,
    gridStatus: 'NORMAL'
  },
  {
    campusId: 'gec-ajmer',
    campusName: 'Government Engineering College Ajmer',
    location: 'Ajmer, Rajasthan',
    solarCapacityKw: 300,
    windCapacityKw: 80,
    batteryCapacityKwh: 200,
    currentRenewableSharePct: 78.5,
    gridStatus: 'NORMAL'
  },
  {
    campusId: 'dte-kota',
    campusName: 'Government Engineering College, Kota',
    location: 'Kota, Rajasthan',
    solarCapacityKw: 250,
    windCapacityKw: 50,
    batteryCapacityKwh: 150,
    currentRenewableSharePct: 64.2,
    gridStatus: 'PEAK_TARIFF'
  },
  {
    campusId: 'dte-bikaner',
    campusName: 'Govt. Engineering College, Bikaner',
    location: 'Bikaner, Rajasthan',
    solarCapacityKw: 400,
    windCapacityKw: 200,
    batteryCapacityKwh: 300,
    currentRenewableSharePct: 92.1,
    gridStatus: 'NORMAL'
  },
  {
    campusId: 'dte-udaipur',
    campusName: 'CTAE Udaipur Campus',
    location: 'Udaipur, Rajasthan',
    solarCapacityKw: 200,
    windCapacityKw: 40,
    batteryCapacityKwh: 100,
    currentRenewableSharePct: 71.8,
    gridStatus: 'NORMAL'
  }
];

export function getScenarioCurrentPoint(scenario: ScenarioId): TelemetryPoint {
  if (scenario === 'CLOUD_BURST') {
    return {
      timestamp: '14:15',
      solarKw: 18,
      windKw: 8,
      campusDemandKw: 95,
      batterySoc: 48,
      batteryFlowKw: -45, // Discharging
      gridImportKw: 24,
      gridExportKw: 0
    };
  } else if (scenario === 'EVENING_PEAK') {
    return {
      timestamp: '19:00',
      solarKw: 0,
      windKw: 38,
      campusDemandKw: 130,
      batterySoc: 32,
      batteryFlowKw: -60, // Discharging full capacity
      gridImportKw: 32,
      gridExportKw: 0
    };
  }

  // SUNNY_NOON (Default)
  return {
    timestamp: '12:30',
    solarKw: 142,
    windKw: 25,
    campusDemandKw: 110,
    batterySoc: 72,
    batteryFlowKw: 32, // Charging
    gridImportKw: 0,
    gridExportKw: 25
  };
}

export function getScenarioTelemetryTimeSeries(scenario: ScenarioId): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  const cur = getScenarioCurrentPoint(scenario);

  hours.forEach((time) => {
    const h = parseInt(time.split(':')[0], 10);
    
    let solarKw = Math.round(cur.solarKw * (h >= 6 && h <= 18 ? Math.sin(((h - 6) / 12) * Math.PI) * 1.2 : 0));
    let windKw = Math.round(cur.windKw + Math.sin(h) * 5);
    let campusDemandKw = Math.round(cur.campusDemandKw + Math.cos(h) * 10);
    
    if (scenario === 'CLOUD_BURST' && h >= 13 && h <= 16) {
      solarKw = Math.round(18 + Math.random() * 5);
    } else if (scenario === 'EVENING_PEAK' && h >= 18) {
      solarKw = 0;
      windKw = Math.round(38 + Math.random() * 6);
    }

    let net = solarKw + windKw - campusDemandKw;
    let bFlow = net > 0 ? Math.min(net, 40) : -Math.min(Math.abs(net), 60);
    let gImport = net < 0 ? Math.max(0, Math.abs(net) - Math.abs(bFlow)) : 0;
    let gExport = net > 0 ? Math.max(0, net - bFlow) : 0;

    points.push({
      timestamp: time,
      solarKw: Math.max(0, solarKw),
      windKw: Math.max(0, windKw),
      campusDemandKw: Math.max(20, campusDemandKw),
      batterySoc: Math.round(Math.max(20, Math.min(95, cur.batterySoc + (h - 12) * 2))),
      batteryFlowKw: bFlow,
      gridImportKw: Math.max(0, gImport),
      gridExportKw: Math.max(0, gExport)
    });
  });

  return points;
}

export function getScenarioDispatchActions(scenario: ScenarioId): DispatchAction[] {
  if (scenario === 'CLOUD_BURST') {
    return [
      {
        id: 'act-cb-1',
        source: 'Demand Response',
        title: 'High-Priority Load Curtailment for Non-Critical AC Blocks',
        detail: 'Cloud burst dropped solar output by 87%. Curtailing HVAC in Block-B Auditorium and administrative corridors.',
        timing: 'Window: Next 90 Mins',
        financialImpact: 'Est. Savings: ₹3,200',
        severity: 'critical',
        status: 'Pending Verification'
      },
      {
        id: 'act-cb-2',
        source: 'BESS Storage',
        title: 'Discharge BESS to Support Critical Labs & Hostels',
        detail: 'Discharging ESS at 45 kW to keep grid import under sub-peak tariff quota.',
        timing: 'Active Now',
        financialImpact: 'Est. Savings: ₹2,800',
        severity: 'advisory',
        status: 'Applied Automatically'
      },
      {
        id: 'act-cb-3',
        source: 'Solar-Wind Dispatch',
        title: 'Pre-empt Grid Tariff Spike via Microgrid Load Balancing',
        detail: 'Staggering non-essential electrical machinery across mechanical workshops during cloud deficit window.',
        timing: 'Window: 14:00 - 16:00',
        financialImpact: 'Est. Savings: ₹1,950',
        severity: 'normal',
        status: 'Pending Verification'
      }
    ];
  } else if (scenario === 'EVENING_PEAK') {
    return [
      {
        id: 'act-ep-1',
        source: 'BESS Storage',
        title: 'Peak Shaving Active: Avoided penalty charges of ₹2,400/hr',
        detail: 'Discharging BESS at full 60 kW capacity during JdVVNL peak Time-of-Day tariff window (₹11.50/kWh).',
        timing: 'Schedule: 18:30 - 21:30',
        financialImpact: 'Avoided Penalty: ₹2,400/hr',
        severity: 'critical',
        status: 'Applied Automatically'
      },
      {
        id: 'act-ep-2',
        source: 'Demand Response',
        title: 'Hostel Common Area Lighting Energy Saver Mode',
        detail: 'Dimming decorative campus lighting & enabling motion sensors in hostel corridors to minimize baseload.',
        timing: 'Active Now',
        financialImpact: 'Est. Savings: ₹850',
        severity: 'advisory',
        status: 'Applied Automatically'
      },
      {
        id: 'act-ep-3',
        source: 'Solar-Wind Dispatch',
        title: 'Capture Thar Evening Wind Gusts (+38 kW)',
        detail: 'Utilizing desert wind surge to supply hostel evening baseload without drawing expensive grid units.',
        timing: 'Active Now',
        financialImpact: 'Est. Savings: ₹1,650',
        severity: 'normal',
        status: 'Applied Automatically'
      }
    ];
  }

  // SUNNY_NOON (Default)
  return [
    {
      id: 'act-sn-1',
      source: 'Solar-Wind Dispatch',
      title: 'Schedule Heavy Autoclave & Water Pumping Windows',
      detail: 'Surplus solar generation (+32 kW) available. Directing excess power to Thermal Lab thermal energy storage & water pumps.',
      timing: 'Window: 12:30 - 14:30',
      financialImpact: 'Est. Savings: ₹1,820',
      severity: 'advisory',
      status: 'Pending Verification'
    },
    {
      id: 'act-sn-2',
      source: 'BESS Storage',
      title: 'Fast Charge BESS to 90% Capacity',
      detail: 'Pre-charging LiFePO4 ESS battery bank using zero-cost solar surplus before afternoon peak.',
      timing: 'Active Now',
      financialImpact: 'Est. Savings: ₹2,450',
      severity: 'normal',
      status: 'Applied Automatically'
    },
    {
      id: 'act-sn-3',
      source: 'Demand Response',
      title: 'Thermal Lab Load Shifting Active',
      detail: 'Shifted high-draw thermal physics lab machinery to current peak solar window.',
      timing: 'Active Now',
      financialImpact: 'Est. Savings: ₹1,100',
      severity: 'normal',
      status: 'Applied Automatically'
    }
  ];
}

export function getScenarioAggregateMetrics(scenario: ScenarioId): AggregateMetrics {
  const p = getScenarioCurrentPoint(scenario);
  const totalGen = p.solarKw + p.windKw;
  const share = p.campusDemandKw > 0 ? Math.min(100, Math.round((totalGen / p.campusDemandKw) * 100)) : 100;
  
  let tariff = 7.50;
  let statusMsg = 'GRID TARIFF: REGULAR (₹7.50/kWh)';

  if (scenario === 'EVENING_PEAK') {
    tariff = 11.50;
    statusMsg = 'GRID TARIFF: PEAK TOD SURGE (₹11.50/kWh)';
  } else if (scenario === 'CLOUD_BURST') {
    tariff = 8.20;
    statusMsg = 'GRID TARIFF: SUB-PEAK DEFICIT (₹8.20/kWh)';
  }

  return {
    renewableSharePct: share,
    totalGenerationKw: totalGen,
    gridImportKw: p.gridImportKw,
    dailySavingsInr: Math.round(totalGen * tariff),
    co2AvoidedKg: Math.round(totalGen * 0.82),
    gridTariffRateInr: tariff,
    gridStatusMessage: statusMsg
  };
}

export async function fetchLiveBackendData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const [telemetryRes, actionsRes, metricsRes] = await Promise.all([
      fetch('http://localhost:8000/api/telemetry/live', { signal: controller.signal }),
      fetch('http://localhost:8000/api/actions/dispatch', { signal: controller.signal }),
      fetch('http://localhost:8000/api/metrics/aggregate', { signal: controller.signal })
    ]);

    clearTimeout(timeoutId);

    if (!telemetryRes.ok || !actionsRes.ok || !metricsRes.ok) {
      throw new Error(`HTTP Error: ${telemetryRes.status}`);
    }

    const telemetry = await telemetryRes.json();
    const actions = await actionsRes.json();
    const metrics = await metricsRes.json();

    return { live: true, telemetry, actions, metrics };
  } catch (err) {
    clearTimeout(timeoutId);
    return { live: false };
  }
}

export async function fetchRajasthanWeatherTelemetry() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.2389&longitude=73.0243&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,cloud_cover,direct_normal_irradiance');
    const data = await res.json();
    return {
      temp: data.current?.temperature_2m ?? 32.4,
      humidity: data.current?.relative_humidity_2m ?? 41,
      windSpeedKnots: Math.round((data.current?.wind_speed_10m ?? 16) * 0.539957),
      cloudCoverPct: data.current?.cloud_cover ?? 14,
      dniWm2: data.current?.direct_normal_irradiance ?? 289
    };
  } catch (e) {
    return {
      temp: 32.4,
      humidity: 41,
      windSpeedKnots: 4,
      cloudCoverPct: 14,
      dniWm2: 289
    };
  }
}
