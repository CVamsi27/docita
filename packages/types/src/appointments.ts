import { z } from "zod";
import { appointmentStatusSchema, appointmentTypeSchema } from "./users";
import { Patient, patientSchema } from "./patients";
import { vitalSignSchema } from "./vitals";
import { invoiceSchema } from "./invoices";
import { prescriptionSchema } from "./medications";
import { generalExaminationSchema, systemicExaminationSchema, clinicalInvestigationSchema, clinicalNoteSchema } from "./clinical";
import { icdCodeSchema, cptCodeSchema } from "./medical-coding";
export const appointmentPrioritySchema = z.enum([
  "ROUTINE",
  "URGENT",
  "EMERGENCY",
]);
export type AppointmentPriority = z.infer<typeof appointmentPrioritySchema>;

export const APPOINTMENT_PRIORITY_LABELS: Record<AppointmentPriority, string> =
{
  ROUTINE: "Routine",
  URGENT: "Urgent",
  EMERGENCY: "Emergency",
};

export const APPOINTMENT_PRIORITY_COLORS: Record<AppointmentPriority, string> =
{
  ROUTINE: "bg-blue-100 text-blue-800 border-blue-300",
  URGENT: "bg-orange-100 text-orange-800 border-orange-300",
  EMERGENCY: "bg-red-100 text-red-800 border-red-300",
};

export const appointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  clinicId: z.string().min(1, "Clinic is required"),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: appointmentStatusSchema,
  type: appointmentTypeSchema,
  priority: appointmentPrioritySchema.default("ROUTINE").optional(),

  // Consultation Notes - Doctor's notes saved per consultation
  consultationNotes: z.string().optional(), // Clinical notes and observations from this consultation

  // Legacy fields (kept for backward compatibility)
  notes: z.string().optional(),
  observations: z.string().optional(),

  // Clinical Documentation - SOAP Format
  // Subjective
  chiefComplaint: z.string().optional(), // Primary reason for visit
  historyOfPresentIllness: z.string().optional(), // Detailed history of current illness (HPI)
  pastMedicalHistory: z.string().optional(), // Past medical, surgical, family history
  reviewOfSystems: z.string().optional(), // Systematic review of body systems

  // Objective
  generalExamination: generalExaminationSchema.optional(), // General physical examination
  systemicExamination: systemicExaminationSchema.optional(), // System-wise examination

  // Assessment
  provisionalDiagnosis: z.string().optional(), // Initial diagnosis before investigations
  differentialDiagnosis: z.string().optional(), // Other possible diagnoses
  clinicalImpression: z.string().optional(), // Doctor's overall clinical impression

  // Plan
  investigations: z.array(clinicalInvestigationSchema).optional(), // Ordered investigations
  finalDiagnosis: z.string().optional(), // Confirmed diagnosis after investigations
  treatmentPlan: z.string().optional(), // Treatment approach
  followUpPlan: z.string().optional(), // Follow-up instructions

  // Timestamps
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),

  // Relations
  patient: patientSchema.optional(),
  doctor: z.object({ name: z.string() }).optional(),
  vitalSign: vitalSignSchema.optional(),
  prescription: prescriptionSchema.optional(),
  invoice: invoiceSchema.optional(),
  diagnoses: z
    .array(
      z.object({
        id: z.string(),
        icdCodeId: z.string(),
        icdCode: icdCodeSchema.optional(),
        notes: z.string().optional(),
        isPrimary: z.boolean(),
        createdAt: z.string().or(z.date()),
      }),
    )
    .optional(),
  procedures: z
    .array(
      z.object({
        id: z.string(),
        cptCodeId: z.string(),
        cptCode: cptCodeSchema.optional(),
        notes: z.string().optional(),
        createdAt: z.string().or(z.date()),
        updatedAt: z.string().or(z.date()),
      }),
    )
    .optional(),
});
export type Appointment = z.infer<typeof appointmentSchema>;

export const createAppointmentSchema = appointmentSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    patient: true,
    doctor: true,
    vitalSign: true,
    prescription: true,
    invoice: true,
    diagnoses: true,
    procedures: true,
    // Omit clinical documentation fields for initial creation
    chiefComplaint: true,
    historyOfPresentIllness: true,
    pastMedicalHistory: true,
    reviewOfSystems: true,
    generalExamination: true,
    systemicExamination: true,
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentSchema.partial();
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const updateClinicalNoteSchema = clinicalNoteSchema;
export type UpdateClinicalNoteInput = z.infer<typeof updateClinicalNoteSchema>;
