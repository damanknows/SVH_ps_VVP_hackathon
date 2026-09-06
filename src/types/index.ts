// ─── Multi-Campus Registry ──────────────────────────────────────────────────
export interface Campus {
  id: string;
  name: string;          // Short display name
  fullName: string;      // Full institutional name
  city: string;
  district: string;
  solarCapacityKw: number;
  windCapacityKw: number;
  batteryCapacityKwh: number;
  peakDemandKw: number;
  campusCode: string;    // e.g. MNIT-JPR
}

// ─── VPP Asset Types ────────────────────────────────────────────────────────
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

// ─── Real-Time Telemetry ─────────────────────────────────────────────────────
export interface Telemetry {
  timestamp: string; // ISO 8601 string
  socPct: number; // 0-100
  flowsKw: Record<AssetType, number>; // signed: +generation/import, -consumption/export
  gridStatus: 'import' | 'export' | 'islanded';
  autonomyPct: number;
  savingsPerHour: number; // ₹/hr
  activeGenKw: number; // instantaneous renewable generation (solar + wind) in kW
  totalGenKw: number;  // total generation capacity in kW
}

// ─── Predictive Forecast ─────────────────────────────────────────────────────
export interface ForecastPoint {
  timestamp: string;
  p10: number;
  p50: number;
  p90: number;
  tariff: number;
  socProjected?: number;
}

// ─── Optimization & Action Plan ──────────────────────────────────────────────
export type ActionPriority = 'HIGH' | 'MED' | 'LOW' | 'INFO';

export interface ActionItem {
  id: string;
  time: string;
  priority: ActionPriority;
  icon: string;
  title: string;
  reason: string;
  timestamp?: string; // backwards compatibility alias for time
  forecast?: ForecastPoint[];
}

export interface ActionPlan {
  generatedAt: string;
  actions: ActionItem[];
}

// ─── Live WebSocket Messages ─────────────────────────────────────────────────
export type WSMessage =
  | { type: 'telemetry'; payload: Telemetry }
  | { type: 'action_plan'; payload: ActionPlan }
  | { type: 'alert'; payload: { level: 'info' | 'warning' | 'critical'; message: string } };

// ─── Strategy & Simulation ───────────────────────────────────────────────────
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
  baseline: any;
}
