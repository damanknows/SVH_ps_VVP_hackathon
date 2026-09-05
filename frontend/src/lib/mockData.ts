import { Asset, Telemetry, ActionItem, ForecastPoint, SimulationResult } from '@/types';

export const mockAssets: Asset[] = [
  { id: 'sol-01', type: 'solar', label: 'Rooftop Solar Array', capacityKw: 450 },
  { id: 'wnd-01', type: 'wind', label: 'Micro Wind Turbines', capacityKw: 150 },
  { id: 'bat-01', type: 'battery', label: 'BESS Unit Alpha', capacityKw: 500 },
  { id: 'grd-01', type: 'grid', label: 'Main Substation Grid', capacityKw: 1000 },
  { id: 'ld-01', type: 'load', label: 'Facility Base Load', capacityKw: 320 },
  { id: 'cld-01', type: 'critical_load', label: 'Data Center & Emergency', capacityKw: 120 },
];

export const mockTelemetry: Telemetry = {
  timestamp: new Date().toISOString(),
  socPct: 68.5,
  flowsKw: {
    solar: 340,
    wind: 85,
    battery: -120, // charging
    grid: -45,     // export to grid
    load: 210,
    critical_load: 50,
    export: 45,
    curtail: 0,
  },
  gridStatus: 'export',
  autonomyPct: 82.4,
  savingsPerHour: 3450,
};

export const generateMockForecast = (): ForecastPoint[] => {
  const now = new Date();
  const points: ForecastPoint[] = [];
  
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 3600 * 1000);
    const hour = time.getHours();
    
    // Solar peak around mid-day (11 to 15)
    const solarFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const baseP50 = Math.round(50 + solarFactor * 400 + Math.random() * 20);
    const p10 = Math.max(20, Math.round(baseP50 * 0.78));
    const p90 = Math.round(baseP50 * 1.22);
    
    // Dynamic peak/off-peak tariff
    const isPeak = (hour >= 9 && hour <= 12) || (hour >= 18 && hour <= 22);
    const tariff = isPeak ? 12.5 : hour >= 0 && hour <= 6 ? 4.5 : 7.8;
    
    const socProjected = Math.min(100, Math.max(15, Math.round(50 + Math.sin(i / 3) * 35)));

    points.push({
      timestamp: time.toISOString(),
      p10,
      p50: baseP50,
      p90,
      tariff,
      socProjected,
    });
  }
  
  return points;
};

export const mockForecastPoints = generateMockForecast();

export const mockActionItems: ActionItem[] = [
  {
    id: 'act-101',
    timestamp: new Date(Date.now() + 15 * 60000).toISOString(),
    icon: 'battery-charging',
    title: 'Pre-charge BESS to 90%',
    reason: 'Upcoming peak tariff window (18:00–22:00) with solar yield drop predicted.',
    priority: 'HIGH',
    forecast: mockForecastPoints,
  },
  {
    id: 'act-102',
    timestamp: new Date(Date.now() + 45 * 60000).toISOString(),
    icon: 'zap',
    title: 'Curtail Non-Critical HVAC Load',
    reason: 'High ambient temperature expected to spike baseline power consumption.',
    priority: 'MED',
    forecast: mockForecastPoints,
  },
  {
    id: 'act-103',
    timestamp: new Date(Date.now() + 120 * 60000).toISOString(),
    icon: 'arrow-up-right',
    title: 'Export Surplus Solar Power',
    reason: 'High spot market price (₹12.50/kWh) offering peak revenue.',
    priority: 'LOW',
    forecast: mockForecastPoints,
  },
  {
    id: 'act-104',
    timestamp: new Date(Date.now() + 240 * 60000).toISOString(),
    icon: 'shield-check',
    title: 'Isolate Critical Microgrid Section',
    reason: 'Routine grid transformer maintenance scheduled by local utility.',
    priority: 'INFO',
    forecast: mockForecastPoints,
  },
];

export const mockSimulationResult: SimulationResult = {
  annualSavingsInr: 1450000,
  co2eAvoidedTons: 112,
  gridIndependencePct: 78.4,
  bessCyclesPerYear: 320,
  baseline: {
    batteryCapacityKwh: 300,
    exportLimitKw: 200,
    carbonPriceInrPerTon: 800,
    criticalLoadPct: 25,
    annualSavingsInr: 720000,
  },
};

export const demoScenarios: Record<string, Telemetry> = {
  sunny_day: {
    timestamp: new Date().toISOString(),
    socPct: 85.0,
    flowsKw: {
      solar: 440,
      wind: 110,
      battery: -150,
      grid: -180,
      load: 180,
      critical_load: 40,
      export: 180,
      curtail: 0,
    },
    gridStatus: 'export',
    autonomyPct: 94.0,
    savingsPerHour: 5200,
  },
  cloud_cover: {
    timestamp: new Date().toISOString(),
    socPct: 52.0,
    flowsKw: {
      solar: 110,
      wind: 60,
      battery: 120,
      grid: 30,
      load: 260,
      critical_load: 60,
      export: 0,
      curtail: 0,
    },
    gridStatus: 'import',
    autonomyPct: 65.0,
    savingsPerHour: 1800,
  },
  evening_peak: {
    timestamp: new Date().toISOString(),
    socPct: 35.0,
    flowsKw: {
      solar: 15,
      wind: 90,
      battery: 240,
      grid: -40,
      load: 255,
      critical_load: 50,
      export: 40,
      curtail: 0,
    },
    gridStatus: 'export',
    autonomyPct: 88.0,
    savingsPerHour: 4600,
  },
  grid_outage: {
    timestamp: new Date().toISOString(),
    socPct: 74.0,
    flowsKw: {
      solar: 280,
      wind: 75,
      battery: -50,
      grid: 0,
      load: 215,
      critical_load: 90,
      export: 0,
      curtail: 0,
    },
    gridStatus: 'islanded',
    autonomyPct: 100.0,
    savingsPerHour: 2900,
  },
};
