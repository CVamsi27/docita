import { z } from "zod";
import {
  dpdpBulkAttestationSchema,
  dpdpConsentPayloadSchema,
} from "../contracts/dpdp";

/** Bulk CSV import entity types (API + UI). */
export const bulkImportEntityTypeSchema = z.enum([
  "PATIENT",
  "PRESCRIPTION",
  "DOCTOR",
  "LAB_TEST",
  "INVENTORY",
]);

/** Request body for `POST /imports/bulk` — CSV bytes as standard base64 (not JSON Buffer). */
export const bulkImportRequestSchema = z
  .object({
    entityType: bulkImportEntityTypeSchema,
    fileName: z.string().min(1),
    fileBase64: z.string().min(1),
    /**
     * Per-batch DPDP Act, 2023 attestation. Required when `entityType` is
     * `PATIENT`; the operator confirms every row has prior signed/verbal
     * consent on file. Backend records one Consent row per created patient
     * referencing this attestation and the upload job id.
     */
    dpdpAttestation: dpdpBulkAttestationSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.entityType === "PATIENT" && !val.dpdpAttestation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dpdpAttestation"],
        message:
          "DPDP consent attestation is required when bulk importing patients",
      });
    }
  });

export const bulkImportStartResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  totalRows: z.number().int(),
});

export const bulkImportJobRowErrorSchema = z.object({
  rowNumber: z.number().int(),
  error: z.string(),
});

export const bulkImportJobStatusResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  entityType: z.string(),
  fileName: z.string(),
  totalRows: z.number().int(),
  processedRows: z.number().int(),
  successRows: z.number().int(),
  failedRows: z.number().int(),
  skippedRows: z.number().int(),
  errors: z.array(bulkImportJobRowErrorSchema),
  errorSummary: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
});

export type BulkImportEntityType = z.infer<typeof bulkImportEntityTypeSchema>;
export type BulkImportRequest = z.infer<typeof bulkImportRequestSchema>;
export type BulkImportStartResponse = z.infer<typeof bulkImportStartResponseSchema>;
export type BulkImportJobStatusResponse = z.infer<
  typeof bulkImportJobStatusResponseSchema
>;

export const importInvoiceItemDraftSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const importInvoiceDraftSchema = z.object({
  grandTotal: z.number().positive(),
  subtotal: z.number().nonnegative().optional(),
  taxTotal: z.number().nonnegative().optional(),
  items: z.array(importInvoiceItemDraftSchema).min(1),
});

export const ocrMedicationCommitSchema = z.object({
  name: z.string().min(1),
  dosage: z.string(),
  frequency: z.string(),
  route: z.string().optional(),
  duration: z.string().optional(),
});

export const ocrImportCommitRequestSchema = z.object({
  clinicId: z.string().min(1),
  doctorId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1),
  address: z.string().optional(),
  diagnosis: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(ocrMedicationCommitSchema).optional(),
  vitals: z
    .object({
      systolicBP: z.number().int().optional(),
      diastolicBP: z.number().int().optional(),
      temperature: z.number().optional(),
      pulse: z.number().int().optional(),
    })
    .optional(),
  consultationNotes: z.string().optional(),
  invoiceDraft: importInvoiceDraftSchema.optional(),
  acknowledgeReview: z.boolean().optional(),
  /**
   * DPDP Act, 2023 consent payload. Required when this commit creates a new
   * patient (OCR commits always create a patient row), so the staff member
   * driving the commit must confirm consent was obtained from the patient.
   */
  dpdpConsent: dpdpConsentPayloadSchema.optional(),
});

/**
 * Per-batch DPDP attestation for the legacy Excel/CSV `/imports/patients`
 * endpoints. Sent as a JSON string in a multipart form field, or inline on
 * the session-mapped JSON commit.
 */
export const excelImportPatientsRequestSchema = z.object({
  columnMapping: z.record(z.string()).optional(),
  dpdpAttestation: dpdpBulkAttestationSchema,
});

export type ExcelImportPatientsRequest = z.infer<
  typeof excelImportPatientsRequestSchema
>;

export const ocrImportCommitResponseSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string(),
});

export type ImportInvoiceDraft = z.infer<typeof importInvoiceDraftSchema>;
export type OcrImportCommitRequest = z.infer<typeof ocrImportCommitRequestSchema>;
export type OcrImportCommitResponse = z.infer<typeof ocrImportCommitResponseSchema>;

export const ImportJobType = z.enum([
  "EXCEL_PATIENTS",
  "EXCEL_APPOINTMENTS",
  "OCR_DOCUMENT",
  "BULK_SCAN",
]);

export const ImportJobStatus = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "PARTIALLY_COMPLETED",
]);

export const importJobSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  type: z.string().or(ImportJobType),
  status: z.string().or(ImportJobStatus),
  fileName: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  columnMapping: z.record(z.unknown()).optional(), 
  totalRecords: z.number().int(),
  processed: z.number().int(),
  successful: z.number().int(),
  failed: z.number().int(),
  errors: z.record(z.unknown()).optional(), 
  results: z.record(z.unknown()).optional(), 
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export const bulkImportJobSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  userId: z.string(),
  entityType: z.string(),
  fileName: z.string(),
  fileSize: z.number().int(),
  originalKey: z.string(),
  status: z.string(),
  totalRows: z.number().int(),
  processedRows: z.number().int(),
  successRows: z.number().int(),
  failedRows: z.number().int(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
  startedAt: z.date().or(z.string()).nullable().optional(),
  completedAt: z.date().or(z.string()).nullable().optional(),
  createdBy: z.string().optional(),
});

export type ImportJob = z.infer<typeof importJobSchema>;
export type BulkImportJob = z.infer<typeof bulkImportJobSchema>;

export interface DBField {
  label: string;
  field: string;
  required?: boolean;
}
