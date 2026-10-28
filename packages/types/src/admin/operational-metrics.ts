import { z } from "zod";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const internalOperationalMetricsSchema = z.object({
  // Absent on older servers, whose request scope and validity rules differ.
  definitionVersion: z.literal(2).optional(),
  window: z.object({
    startInclusive: z.string().datetime(),
    endExclusive: z.string().datetime(),
    days: z.literal(30),
  }),
  activity: z.object({
    clinicsWithAppointments: count,
    appointments: count,
    completedAppointments: count,
    prescriptionsCreated: count.optional(),
    clinicPatientsSeen: count.optional(),
    invoices: count,
    jobs: count,
    failedJobs: count,
  }),
  telemetry: z.object({
    requestScope: z.literal("CUSTOMER").optional(),
    samples: count,
    serverErrors: count,
    errorRatePercent: z.number().min(0).max(100).nullable(),
    p50Ms: z.number().nonnegative().nullable(),
    p95Ms: z.number().nonnegative().nullable(),
    p99Ms: z.number().nonnegative().nullable().optional(),
    validLatencySamples: count.optional(),
    invalidLatencySamples: count.optional(),
    firstSampleAt: z.string().datetime().nullable(),
    lastSampleAt: z.string().datetime().nullable(),
  }),
});
export type InternalOperationalMetrics = z.infer<
  typeof internalOperationalMetricsSchema
>;
