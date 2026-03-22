import { z } from "zod";

export const medicationDoseStatusSchema = z.enum([
  "PENDING",
  "TAKEN",
  "MISSED",
  "SKIPPED",
  "ADMINISTERED",
]);

export const medicationDoseSourceSchema = z.enum([
  "PATIENT_REPORTED",
  "CLINICIAN_RECORDED",
  "PHARMACY_CONFIRMED",
  "SYSTEM_GENERATED",
]);

export const medicationDoseSchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  patientId: z.string(),
  clinicId: z.string(),
  prescriptionId: z.string().nullable(),
  scheduledAt: z.string().datetime(),
  takenAt: z.string().datetime().nullable(),
  status: medicationDoseStatusSchema,
  doseAmount: z.string().nullable(),
  route: z.string().nullable(),
  administeredBy: z.string().nullable(),
  notes: z.string().nullable(),
  source: medicationDoseSourceSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createMedicationDoseSchema = z.object({
  medicationId: z.string(),
  scheduledAt: z.string().datetime(),
  status: medicationDoseStatusSchema.optional(),
  doseAmount: z.string().optional(),
  notes: z.string().optional(),
});

export const createAdHocDoseSchema = z.object({
  medicationId: z.string(),
  takenAt: z.string().datetime().optional(),
  doseAmount: z.string().optional(),
  notes: z.string().optional(),
});

export const updateMedicationDoseSchema = z.object({
  takenAt: z.string().datetime().optional(),
  status: medicationDoseStatusSchema.optional(),
  notes: z.string().optional(),
});

export const medicationDoseHistoryQuerySchema = z.object({
  prescriptionId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: medicationDoseStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const medicationAdherenceSummarySchema = z.object({
  totalDoses: z.number(),
  taken: z.number(),
  missed: z.number(),
  skipped: z.number(),
  adherenceRate: z.number(),
});

export const activeMedicationSchema = z.object({
  medicationId: z.string(),
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  route: z.string(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
  isPRN: z.boolean(),
  prnInstructions: z.string().nullable(),
  prescriptionId: z.string(),
  prescriptionDate: z.string().datetime(),
  adherence: medicationAdherenceSummarySchema.nullable(),
});

export type MedicationDoseStatus = z.infer<typeof medicationDoseStatusSchema>;
export type MedicationDoseSource = z.infer<typeof medicationDoseSourceSchema>;
export type MedicationDose = z.infer<typeof medicationDoseSchema>;
export type CreateMedicationDose = z.infer<typeof createMedicationDoseSchema>;
export type CreateAdHocDose = z.infer<typeof createAdHocDoseSchema>;
export type UpdateMedicationDose = z.infer<typeof updateMedicationDoseSchema>;
export type MedicationDoseHistoryQuery = z.infer<
  typeof medicationDoseHistoryQuerySchema
>;
export type MedicationAdherenceSummary = z.infer<
  typeof medicationAdherenceSummarySchema
>;
export type ActiveMedication = z.infer<typeof activeMedicationSchema>;
