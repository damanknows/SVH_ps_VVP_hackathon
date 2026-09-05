export type ScenarioId = 'SUNNY_NOON' | 'CLOUD_BURST' | 'EVENING_PEAK';

export interface TelemetryPoint {
  timestamp: string; // "13:00"
  solarKw: number;
  windKw: number;
  campusDemandKw: number;
  batterySoc: number; // 0 - 100%
  batteryFlowKw: number; // positive = charging, negative = discharging
  gridImportKw: number;
  gridExportKw: number;
}

export interface DispatchAction {
  id: string;
  source: 'Solar-Wind Dispatch' | 'BESS Storage' | 'Demand Response';
  title: string;
  detail: string;
  timing: string;
  financialImpact: string; // e.g. "Est. Savings: ₹1,820"
  severity: 'normal' | 'advisory' | 'critical';
  status: 'Pending Verification' | 'Applied Automatically' | 'Applied (Operator Verified)';
}

export interface AggregateMetrics {
  renewableSharePct: number;
  totalGenerationKw: number;
  gridImportKw: number;
  dailySavingsInr: number;
  co2AvoidedKg: number;
  gridTariffRateInr: number;
  gridStatusMessage: string;
}

export interface ForecastDataPoint {
  timestamp: string;
  solarForecastKw: number;
  windForecastKw: number;
  demandForecastKw: number;
}

export interface CampusTelemetrySummary {
  campusId: string;
  campusName: string;
  location: string;
  solarCapacityKw: number;
  windCapacityKw: number;
  batteryCapacityKwh: number;
  currentRenewableSharePct: number;
  gridStatus: 'NORMAL' | 'PEAK_TARIFF' | 'ISLANDED';
}
