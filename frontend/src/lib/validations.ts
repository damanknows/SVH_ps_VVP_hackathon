import { z } from 'zod';

export const TelemetrySchema = z.object({
  timestamp: z.string(),
  socPct: z.number().min(0).max(100),
  flowsKw: z.record(z.string(), z.number()),
  gridStatus: z.enum(['import', 'export', 'islanded']),
  autonomyPct: z.number(),
  savingsPerHour: z.number(),
});

export const ActionItemSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  icon: z.string(),
  title: z.string(),
  reason: z.string(),
  priority: z.enum(['HIGH', 'MED', 'LOW', 'INFO']),
});

export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('telemetry'), payload: TelemetrySchema }),
  z.object({
    type: z.literal('action_plan'),
    payload: z.object({ generatedAt: z.string(), actions: z.array(ActionItemSchema) }),
  }),
  z.object({
    type: z.literal('alert'),
    payload: z.object({ level: z.enum(['info', 'warning', 'critical']), message: z.string() }),
  }),
]);
