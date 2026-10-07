import { z } from "zod";

/**
 * Queue wire contract for `QueueController` (`@Controller('queue')`).
 *
 * This module is the single source of truth for the two read endpoints:
 *   - `GET /queue`       -> `queueListResponseSchema` (`mapQueueToken` rows;
 *                           active queue = WAITING + IN_PROGRESS)
 *   - `GET /queue/today` -> `todayQueueResponseSchema` (whole clinic day + rollup)
 *
 * All three shapes below were previously hand-written TypeScript interfaces
 * duplicated across `_types-queue.ts`, `useTodaysPatients`, and the
 * consultation dashboard, each drifting from what the API actually returns
 * (e.g. `priority` is a Prisma `Int` but one copy typed it `string`).
 * `queue-contract-parity.spec.ts` in `apps/api` parses the real mapper output
 * through these schemas, so server drift now fails a test instead of silently
 * reshaping the client.
 */

/** Mirrors the Prisma `QueueTokenStatus` enum. */
export const queueTokenStatusSchema = z.enum([
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export type QueueTokenStatus = z.infer<typeof queueTokenStatusSchema>;

/**
 * `QueueToken.tokenType` is a free-form String column, so the API normalizes
 * unknown values through `parseQueueTokenType`, which falls back to
 * `pending`. Treat this union as "what the server can emit", not "what the
 * database stores".
 */
export const queueTokenTypeSchema = z.enum([
  "scheduled",
  "walk-in",
  "late-arrival",
  "pending",
]);
export type QueueTokenType = z.infer<typeof queueTokenTypeSchema>;

export const queuePatientSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string().nullable(),
  gender: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
});
export type QueuePatient = z.infer<typeof queuePatientSchema>;

export const queueDoctorSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type QueueDoctorSummary = z.infer<typeof queueDoctorSummarySchema>;

/** The appointment the token belongs to, as selected by the queue repository. */
export const queueAppointmentSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  chiefComplaint: z.string().nullable(),
  doctor: queueDoctorSummarySchema.nullable(),
});
export type QueueAppointmentSummary = z.infer<
  typeof queueAppointmentSummarySchema
>;

/**
 * One row of `GET /queue` (`mapQueueToken`). Timestamps are serialized ISO
 * strings; the repository's raw `Date` values never reach the wire.
 */
export const queueTokenSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  appointmentId: z.string().nullable(),
  doctorId: z.string().nullable(),
  tokenNumber: z.number(),
  status: queueTokenStatusSchema,
  priority: z.number(),
  notes: z.string().nullable(),
  calledAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  tokenType: queueTokenTypeSchema,
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number(),
  /**
   * `mapQueueToken` passes the nullable Prisma column through unchanged, so
   * this arrives as `null` — not absent — when the clinic has not estimated a
   * wait. `.nullish()` accepts both encodings.
   */
  estimatedWaitTime: z.number().nullish(),
  consultationStart: z.string().optional(),
  patient: queuePatientSchema,
  doctor: queueDoctorSummarySchema.nullable(),
  appointment: queueAppointmentSummarySchema.nullable(),
});
export type QueueToken = z.infer<typeof queueTokenSchema>;

export const queueListResponseSchema = z.array(queueTokenSchema);
export type QueueListResponse = z.infer<typeof queueListResponseSchema>;

/**
 * One entry of `GET /queue/today` `patients`.
 *
 * Unlike `/queue`, this projection flattens `chiefComplaint` and
 * `appointmentType` to the top level and derives `type` from whether the token
 * is bound to an appointment, so the two endpoints are not field-compatible —
 * see `toQueueRow` in the consultation dashboard for the projection.
 */
export const todayQueueEntrySchema = z.object({
  id: z.string(),
  type: z.enum(["appointment", "queue"]),
  tokenNumber: z.number(),
  tokenType: queueTokenTypeSchema,
  status: queueTokenStatusSchema,
  priority: z.number(),
  scheduledTime: z.string().nullable(),
  /** Check-in is derived from the token's `createdAt`, so it is never null. */
  checkInTime: z.string(),
  patient: queuePatientSchema,
  doctor: queueDoctorSummarySchema.nullable(),
  appointmentId: z.string().nullable(),
  appointmentType: z.string().nullable(),
  chiefComplaint: z.string().nullable(),
  estimatedWaitTime: z.number().nullable(),
  calledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type TodayQueueEntry = z.infer<typeof todayQueueEntrySchema>;

/**
 * Day rollup returned alongside `patients`. `noShow` is currently hard-coded to
 * `0` server-side; it is kept because the UI reserves the slot.
 */
export const queueStatsSchema = z.object({
  total: z.number(),
  pending: z.number(),
  waiting: z.number(),
  inProgress: z.number(),
  completed: z.number(),
  noShow: z.number(),
  walkIns: z.number(),
  scheduled: z.number(),
  avgConsultationMinutes: z.number(),
});
export type QueueStats = z.infer<typeof queueStatsSchema>;

export const todayQueueResponseSchema = z.object({
  patients: z.array(todayQueueEntrySchema),
  stats: queueStatsSchema,
});
export type TodayQueueResponse = z.infer<typeof todayQueueResponseSchema>;