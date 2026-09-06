import { Asset, Campus, Telemetry, ActionItem, ForecastPoint, SimulationResult } from '@/types';

// ─── 1. VPP Engine Status ───────────────────────────────────────────────────
export const mockEngineStatus = {
  optimizationStatus: 'Active (P10-P90)',
  wsProtocol: 'Raw JSON WS',
  microgridId: 'SV-VPP-01',
};

// ─── 2. Static Telemetry (Mock) ──────────────────────────────────────────────
export const mockTelemetry: Telemetry = {
  timestamp: new Date().toISOString(),
  socPct: 82.4,
  flowsKw: {
    solar: 321,
    wind: 136, // 321 + 136 = 457 Total Gen
    grid: -45, // Negative means Exporting to Grid (45 kW export)
    battery: 0,
    load: 321, // Base Load
    critical_load: 124,
    export: 45,
    curtail: 0,
  },
  gridStatus: 'export', // "Exporting to Grid"
  autonomyPct: 82.4,
  savingsPerHour: 3413,
  activeGenKw: 395,
  totalGenKw: 457, // Solar + Wind
};

// ─── 3. Action Items (Priority Timeline) ────────────────────────────────────
export const mockActions: ActionItem[] = [
  {
    id: '1',
    time: '12:00',
    priority: 'HIGH',
    icon: 'battery-charging',
    title: 'Pre-charge BESS to 90%',
    reason: 'Upcoming peak tariff window (18:00–22:00) with solar yield drop predicted.',
  },
  {
    id: '2',
    time: '12:30',
    priority: 'MED',
    icon: 'fan',
    title: 'Curtail Non-Critical HVAC Load',
    reason: 'High ambient temperature expected to spike baseline power consumption.',
  },
  {
    id: '3',
    time: '13:45',
    priority: 'LOW',
    icon: 'sun',
    title: 'Export Surplus Solar Power',
    reason: 'High spot market price (₹12.50/kWh) offering peak revenue.',
  },
  {
    id: '4',
    time: '15:45',
    priority: 'INFO',
    icon: 'info',
    title: 'Isolate Critical Microgrid...',
    reason: 'Routine grid transformer maintenance scheduled by local utility.',
  },
];

// Backwards compatibility alias
export const mockActionItems = mockActions;

// ─── Multi-Campus Registry ──────────────────────────────────────────────────
export const CAMPUSES: Campus[] = [
  {
    id: 'mnit-jpr',
    name: 'MNIT Jaipur',
    fullName: 'Malaviya National Institute of Technology, Jaipur',
    city: 'Jaipur',
    district: 'Jaipur',
    solarCapacityKw: 450,
    windCapacityKw: 150,
    batteryCapacityKwh: 500,
    peakDemandKw: 320,
    campusCode: 'MNIT-JPR',
  },
  {
    id: 'gec-ajmer',
    name: 'GEC Ajmer',
    fullName: 'Government Engineering College, Ajmer',
    city: 'Ajmer',
    district: 'Ajmer',
    solarCapacityKw: 200,
    windCapacityKw: 60,
    batteryCapacityKwh: 200,
    peakDemandKw: 140,
    campusCode: 'GEC-AJM',
  },
  {
    id: 'ctae-udaipur',
    name: 'CTAE Udaipur',
    fullName: 'College of Technology & Engineering, Udaipur (MPUAT)',
    city: 'Udaipur',
    district: 'Udaipur',
    solarCapacityKw: 280,
    windCapacityKw: 80,
    batteryCapacityKwh: 300,
    peakDemandKw: 180,
    campusCode: 'CTAE-UDR',
  },
  {
    id: 'jecrc-jpr',
    name: 'JECRC Jaipur',
    fullName: 'JECRC University, Jaipur',
    city: 'Jaipur',
    district: 'Jaipur',
    solarCapacityKw: 320,
    windCapacityKw: 100,
    batteryCapacityKwh: 350,
    peakDemandKw: 240,
    campusCode: 'JECRC-JPR',
  },
  {
    id: 'bit-jpr',
    name: 'BIT Jaipur',
    fullName: 'Birla Institute of Technology, Jaipur Campus',
    city: 'Jaipur',
    district: 'Jaipur',
    solarCapacityKw: 380,
    windCapacityKw: 120,
    batteryCapacityKwh: 400,
    peakDemandKw: 270,
    campusCode: 'BIT-JPR',
  },
];

// Campus-specific base telemetry
const campusTelemetrySeeds: Record<string, Partial<Pick<Telemetry, 'socPct' | 'flowsKw' | 'gridStatus' | 'autonomyPct' | 'savingsPerHour'>>> = {
  'mnit-jpr':    { socPct: 82.4, autonomyPct: 82.4, savingsPerHour: 3413 },
  'gec-ajmer':   { socPct: 55.2, autonomyPct: 67.0, savingsPerHour: 1820 },
  'ctae-udaipur':{ socPct: 72.1, autonomyPct: 78.5, savingsPerHour: 2640 },
  'jecrc-jpr':   { socPct: 61.8, autonomyPct: 74.2, savingsPerHour: 2910 },
  'bit-jpr':     { socPct: 79.3, autonomyPct: 88.0, savingsPerHour: 3780 },
};

export function getTelemetryForCampus(campusId: string): Telemetry {
  const campus = CAMPUSES.find((c) => c.id === campusId) ?? CAMPUSES[0];
  if (campusId === 'mnit-jpr') {
    return {
      ...mockTelemetry,
      timestamp: new Date().toISOString(),
    };
  }
  const seed = campusTelemetrySeeds[campusId] ?? campusTelemetrySeeds['mnit-jpr'];
  const solarKw = Math.round(campus.solarCapacityKw * 0.76);
  const windKw = Math.round(campus.windCapacityKw * 0.57);
  const loadKw = Math.round(campus.peakDemandKw * 0.66);
  const battKw = -Math.round((solarKw + windKw - loadKw) * 0.55);
  const gridKw = -Math.round((solarKw + windKw - loadKw - Math.abs(battKw)) * 0.8);
  const activeGen = solarKw + windKw;
  const totalGen = campus.solarCapacityKw + campus.windCapacityKw;

  return {
    timestamp: new Date().toISOString(),
    socPct: seed.socPct ?? 65,
    flowsKw: {
      solar: solarKw,
      wind: windKw,
      battery: battKw,
      grid: gridKw,
      load: loadKw,
      critical_load: Math.round(loadKw * 0.24),
      export: gridKw < 0 ? Math.abs(gridKw) : 0,
      curtail: 0,
    },
    gridStatus: gridKw < 0 ? 'export' : 'import',
    autonomyPct: seed.autonomyPct ?? 70,
    savingsPerHour: seed.savingsPerHour ?? 2000,
    activeGenKw: activeGen,
    totalGenKw: totalGen,
  };
}

export const mockAssets: Asset[] = [
  { id: 'sol-01', type: 'solar', label: 'Rooftop Solar Array', capacityKw: 450 },
  { id: 'wnd-01', type: 'wind', label: 'Micro Wind Turbines', capacityKw: 150 },
  { id: 'bat-01', type: 'battery', label: 'BESS Unit Alpha', capacityKw: 500 },
  { id: 'grd-01', type: 'grid', label: 'Main Substation Grid', capacityKw: 1000 },
  { id: 'ld-01', type: 'load', label: 'Facility Base Load', capacityKw: 320 },
  { id: 'cld-01', type: 'critical_load', label: 'Data Center & Emergency', capacityKw: 120 },
];

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
    activeGenKw: 550,
    totalGenKw: 600,
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
    activeGenKw: 170,
    totalGenKw: 600,
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
    activeGenKw: 105,
    totalGenKw: 600,
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
    activeGenKw: 355,
    totalGenKw: 600,
  },
};
