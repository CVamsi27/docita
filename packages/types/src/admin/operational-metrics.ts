import { z } from "zod";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const internalOperationalMetricsSchema = z.object({
  window: z.object({
    startInclusive: z.string().datetime(),
    endExclusive: z.string().datetime(),
    days: z.literal(30),
  }),
  activity: z.object({
    clinicsWithAppointments: count,
    appointments: count,
    completedAppointments: count,
    invoices: count,
    jobs: count,
    failedJobs: count,
  }),
  telemetry: z.object({
    samples: count,
    serverErrors: count,
    errorRatePercent: z.number().min(0).max(100).nullable(),
    p50Ms: z.number().nonnegative().nullable(),
    p95Ms: z.number().nonnegative().nullable(),
    firstSampleAt: z.string().datetime().nullable(),
    lastSampleAt: z.string().datetime().nullable(),
  }),
});
export type InternalOperationalMetrics = z.infer<
  typeof internalOperationalMetricsSchema
>;
