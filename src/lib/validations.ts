import { z } from 'zod';

// ─── Asset Type Schema ─────────────────────────────────────────────────────────
export const AssetTypeSchema = z.enum([
  'solar',
  'wind',
  'battery',
  'grid',
  'load',
  'critical_load',
  'export',
  'curtail',
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

// ─── Grid Status Schema ───────────────────────────────────────────────────────
export const GridStatusSchema = z.enum(['import', 'export', 'islanded']);
export type GridStatus = z.infer<typeof GridStatusSchema>;

// ─── Telemetry Schema ─────────────────────────────────────────────────────────
export const TelemetrySchema = z.object({
  timestamp: z.string().describe('ISO 8601 timestamp string'),
  socPct: z.number().min(0).max(100).describe('Battery state of charge percentage (0-100)'),
  flowsKw: z.record(AssetTypeSchema, z.number()).describe('Power flow rate in kW for each asset type'),
  gridStatus: GridStatusSchema.describe('Current grid connection status'),
  autonomyPct: z.number().min(0).max(100).describe('Renewable energy self-sufficiency percentage (0-100)'),
  savingsPerHour: z.number().describe('Real-time cost savings in INR per hour (₹/hr)'),
  activeGenKw: z.number().min(0).describe('Current active instantaneous generation in kW (solar + wind)'),
  totalGenKw: z.number().min(0).describe('Total aggregated generation capacity in kW'),
});
export type Telemetry = z.infer<typeof TelemetrySchema>;

// ─── Forecast Point Schema ────────────────────────────────────────────────────
export const ForecastPointSchema = z.object({
  timestamp: z.string().describe('ISO 8601 timestamp for the forecast interval'),
  p10: z.number().min(0).describe('10th percentile generation forecast (P10) in kW'),
  p50: z.number().min(0).describe('50th percentile / median generation forecast (P50) in kW'),
  p90: z.number().min(0).describe('90th percentile generation forecast (P90) in kW'),
  tariff: z.number().min(0).describe('Projected dynamic time-of-day tariff rate in ₹/kWh'),
  socProjected: z.number().min(0).max(100).optional().describe('Projected battery SoC percentage'),
});
export type ForecastPoint = z.infer<typeof ForecastPointSchema>;

// ─── Action Priority Schema ───────────────────────────────────────────────────
export const ActionPrioritySchema = z.enum(['HIGH', 'MED', 'LOW', 'INFO']);
export type ActionPriority = z.infer<typeof ActionPrioritySchema>;

// ─── Action Item Schema ───────────────────────────────────────────────────────
export const ActionItemSchema = z.object({
  id: z.string().describe('Unique identifier for the action item'),
  time: z.string().describe('Target execution time or ISO timestamp string'),
  priority: ActionPrioritySchema.describe('Dispatch urgency / priority level'),
  icon: z.string().describe('Lucide icon identifier string (e.g. battery-charging, zap)'),
  title: z.string().describe('Short headline of the dispatch directive'),
  reason: z.string().describe('AI explanation / engineering rationale for the action'),
  timestamp: z.string().optional().describe('Backwards-compatible ISO timestamp'),
  forecast: z.array(ForecastPointSchema).optional().describe('Associated 24-hour predictive forecast'),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

// ─── Action Plan Schema ───────────────────────────────────────────────────────
export const ActionPlanSchema = z.object({
  generatedAt: z.string().describe('ISO timestamp when this action plan was synthesized'),
  actions: z.array(ActionItemSchema).describe('Ordered list of recommended dispatch action items'),
});
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

// ─── Simulation Input Schema ──────────────────────────────────────────────────
export const SimulationInputSchema = z.object({
  batteryCapacityKwh: z.number().min(0).describe('BESS storage rating in kWh'),
  exportLimitKw: z.number().min(0).describe('Grid interconnection export ceiling in kW'),
  carbonPriceInrPerTon: z.number().min(0).describe('Carbon offset valuation in INR per metric ton CO2e'),
  criticalLoadPct: z.number().min(0).max(100).describe('Percentage of campus load designated as uninterruptible (0-100)'),
});
export type SimulationInput = z.infer<typeof SimulationInputSchema>;

// ─── Simulation Result Schema ─────────────────────────────────────────────────
export const SimulationResultSchema = z.object({
  annualSavingsInr: z.number().describe('Projected financial savings per annum in INR (₹)'),
  co2eAvoidedTons: z.number().min(0).describe('Annual carbon emissions abated in metric tons'),
  gridIndependencePct: z.number().min(0).max(100).describe('Campus grid independence / autonomy percentage (0-100)'),
  bessCyclesPerYear: z.number().min(0).describe('Projected annual full equivalent battery charge/discharge cycles'),
  baseline: z.any().describe('Baseline parameter comparison matrix'),
});
export type SimulationResult = z.infer<typeof SimulationResultSchema>;

// ─── WebSocket Message Schema ─────────────────────────────────────────────────
export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('telemetry'),
    payload: TelemetrySchema,
  }),
  z.object({
    type: z.literal('action_plan'),
    payload: ActionPlanSchema,
  }),
  z.object({
    type: z.literal('alert'),
    payload: z.object({
      level: z.enum(['info', 'warning', 'critical']),
      message: z.string(),
    }),
  }),
]);
export type WSMessage = z.infer<typeof WSMessageSchema>;
