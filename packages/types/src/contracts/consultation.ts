import { z } from "zod";
import { icdCodeSchema } from "../shared/medical-coding";

/**
 * Single diagnosis entry posted to POST /appointments/:id/diagnoses.
 */
export const diagnosisSyncItemSchema = z.object({
  icdCodeId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
  isPrimary: z.boolean().optional(),
});
export type DiagnosisSyncItem = z.infer<typeof diagnosisSyncItemSchema>;

/**
 * Request body for POST /appointments/:id/diagnoses.
 * `contentHash` lets the server short-circuit unchanged payloads so that
 * rapid typing in the assessment section never performs redundant writes.
 */
export const diagnosesSyncRequestSchema = z.object({
  diagnoses: z.array(diagnosisSyncItemSchema).max(50).default([]),
  contentHash: z.string().min(1).max(128).optional(),
});
export type DiagnosesSyncRequest = z.infer<typeof diagnosesSyncRequestSchema>;

export const diagnosesSyncResponseSchema = z.object({
  success: z.boolean(),
  contentHash: z.string().optional(),
  skipped: z.boolean().optional(),
  count: z.number().int().nonnegative().optional(),
});
export type DiagnosesSyncResponse = z.infer<typeof diagnosesSyncResponseSchema>;

/**
 * Draft payload persisted on the client for the consultation workspace.
 * Used by `useConsultationDraft` (sessionStorage + autosave) and mirrors the
 * shape sent to the appointment PATCH endpoint for clinical fields.
 */
export const chiefComplaintDraftItemSchema = z.object({
  id: z.string(),
  complaint: z.string().max(500),
  duration: z.string().max(100).optional(),
  severity: z
    .enum(["mild", "moderate", "severe"])
    .or(z.literal(""))
    .optional(),
  notes: z.string().max(2000).optional(),
});
export type ChiefComplaintDraftItem = z.infer<
  typeof chiefComplaintDraftItemSchema
>;

export const diagnosisDraftItemSchema = z.object({
  id: z.string(),
  condition: z.string().max(500),
  icdCodeId: z.string().optional(),
  icdCode: z.string().optional(),
  type: z
    .enum(["provisional", "differential", "final", "working"])
    .default("provisional"),
  status: z.enum(["active", "resolved", "ruled-out"]).default("active"),
  notes: z.string().max(2000).optional(),
  isPrimary: z.boolean().optional(),
});
export type DiagnosisDraftItem = z.infer<typeof diagnosisDraftItemSchema>;

export const medicationDraftItemSchema = z.object({
  id: z.string(),
  name: z.string().max(255),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
  duration: z.string().max(100).optional(),
  route: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});
export type MedicationDraftItem = z.infer<typeof medicationDraftItemSchema>;

export const examinationDraftSchema = z.object({
  general: z
    .object({
      pallor: z.boolean().optional(),
      icterus: z.boolean().optional(),
      cyanosis: z.boolean().optional(),
      clubbing: z.boolean().optional(),
      lymphadenopathy: z.boolean().optional(),
      edema: z.boolean().optional(),
      notes: z.string().max(2000).optional(),
    })
    .default({}),
  systemic: z
    .object({
      cvs: z.string().max(2000).optional(),
      rs: z.string().max(2000).optional(),
      pa: z.string().max(2000).optional(),
      cns: z.string().max(2000).optional(),
      musculoskeletal: z.string().max(2000).optional(),
      notes: z.string().max(2000).optional(),
    })
    .default({}),
});
export type ExaminationDraft = z.infer<typeof examinationDraftSchema>;

export const consultationDraftSchema = z.object({
  appointmentId: z.string(),
  chiefComplaints: z.array(chiefComplaintDraftItemSchema).default([]),
  history: z.string().max(10000).default(""),
  examination: examinationDraftSchema.default({
    general: {},
    systemic: {},
  }),
  diagnoses: z.array(diagnosisDraftItemSchema).default([]),
  treatment: z.string().max(10000).default(""),
  medications: z.array(medicationDraftItemSchema).default([]),
  followUpPlan: z.string().max(2000).default(""),
  updatedAt: z.string().optional(),
});
export type ConsultationDraft = z.infer<typeof consultationDraftSchema>;

/**
 * Narrow allowlist of clinical fields the consultation page may PATCH on
 * an appointment. Used to assemble the server-side domain patch.
 */
export const appointmentDraftUpdateSchema = z
  .object({
    chiefComplaint: z.string().max(5000).optional(),
    historyOfPresentIllness: z.string().max(10000).optional(),
    pastMedicalHistory: z.string().max(10000).optional(),
    reviewOfSystems: z.string().max(10000).optional(),
    consultationNotes: z.string().max(20000).optional(),
    provisionalDiagnosis: z.string().max(2000).optional(),
    differentialDiagnosis: z.string().max(2000).optional(),
    clinicalImpression: z.string().max(5000).optional(),
    finalDiagnosis: z.string().max(5000).optional(),
    treatmentPlan: z.string().max(10000).optional(),
    treatmentHistory: z.string().max(10000).optional(),
    followUpPlan: z.string().max(2000).optional(),
  })
  .partial();
export type AppointmentDraftUpdate = z.infer<
  typeof appointmentDraftUpdateSchema
>;

/**
 * Response shape for domain IcdCode / CptCode search endpoints.
 */
export const icdCodeListResponseSchema = z.array(icdCodeSchema);
export type IcdCodeListResponse = z.infer<typeof icdCodeListResponseSchema>;
