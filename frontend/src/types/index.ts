export type AssetType =
  | 'solar'
  | 'wind'
  | 'battery'
  | 'grid'
  | 'load'
  | 'critical_load'
  | 'export'
  | 'curtail';

export interface Asset {
  id: string;
  type: AssetType;
  label: string;
  capacityKw: number;
}

export interface Telemetry {
  timestamp: string; // ISO 8601
  socPct: number; // 0-100
  flowsKw: Record<AssetType, number>; // signed: +generation/import, -consumption/export
  gridStatus: 'import' | 'export' | 'islanded';
  autonomyPct: number;
  savingsPerHour: number; // ₹/hr
}

export type ActionPriority = 'HIGH' | 'MED' | 'LOW' | 'INFO';

export interface ForecastPoint {
  timestamp: string;
  p10: number;
  p50: number;
  p90: number;
  tariff: number;
  socProjected: number;
}

export interface ActionItem {
  id: string;
  timestamp: string;
  icon: string; // lucide icon name, e.g. "battery-charging"
  title: string;
  reason: string;
  priority: ActionPriority;
  forecast?: ForecastPoint[];
}

export interface ActionPlan {
  generatedAt: string;
  actions: ActionItem[];
}

export type WSMessage =
  | { type: 'telemetry'; payload: Telemetry }
  | { type: 'action_plan'; payload: ActionPlan }
  | { type: 'alert'; payload: { level: 'info' | 'warning' | 'critical'; message: string } };

export interface SimulationInput {
  batteryCapacityKwh: number;
  exportLimitKw: number;
  carbonPriceInrPerTon: number;
  criticalLoadPct: number;
}

export interface SimulationResult {
  annualSavingsInr: number;
  co2eAvoidedTons: number;
  gridIndependencePct: number;
  bessCyclesPerYear: number;
  baseline: SimulationInput & { annualSavingsInr: number };
}
