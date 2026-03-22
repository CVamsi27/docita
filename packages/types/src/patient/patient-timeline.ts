import { z } from "zod";

export const timelineEventTypeSchema = z.enum([
  "APPOINTMENT",
  "PRESCRIPTION",
  "METRIC_RECORD",
  "LAB_TEST",
  "MEDICAL_DOCUMENT",
  "FOLLOW_UP",
  "IMMUNIZATION",
  "ADMISSION",
  "MEDICATION_DOSE",
]);

export const timelineEventSchema = z.object({
  type: timelineEventTypeSchema,
  id: z.string(),
  date: z.string().datetime(),
  title: z.string(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const patientTimelineQuerySchema = z.object({
  eventTypes: z.array(timelineEventTypeSchema).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const patientTimelineResponseSchema = z.object({
  events: z.array(timelineEventSchema),
  total: z.number(),
  summary: z.record(timelineEventTypeSchema, z.number()),
});

export const patientSnapshotSchema = z.object({
  activeConditions: z.array(
    z.object({
      id: z.string(),
      conditionName: z.string(),
      status: z.string(),
      severity: z.string().nullable(),
    }),
  ),
  activeAllergies: z.array(
    z.object({
      id: z.string(),
      allergen: z.string(),
      severity: z.string(),
      allergyType: z.string(),
    }),
  ),
  activeMedications: z.array(
    z.object({
      medicationId: z.string(),
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      isPRN: z.boolean(),
      adherenceRate: z.number().nullable(),
    }),
  ),
  latestVitals: z
    .object({
      systolicBP: z.number().nullable(),
      diastolicBP: z.number().nullable(),
      pulse: z.number().nullable(),
      temperature: z.number().nullable(),
      spo2: z.number().nullable(),
      weight: z.number().nullable(),
      recordedAt: z.string().datetime(),
    })
    .nullable(),
});

export type TimelineEventType = z.infer<typeof timelineEventTypeSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type PatientTimelineQuery = z.infer<typeof patientTimelineQuerySchema>;
export type PatientTimelineResponse = z.infer<
  typeof patientTimelineResponseSchema
>;
export type PatientSnapshot = z.infer<typeof patientSnapshotSchema>;
