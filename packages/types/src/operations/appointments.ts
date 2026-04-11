import { z } from "zod";
import {
  appointmentStatusSchema,
  appointmentTypeSchema,
} from "../shared/users";
import { patientSchema } from "../patient/patients";
import { vitalSignSchema } from "../clinical/vitals";
import { invoiceSchema } from "../billing/invoices";
import { prescriptionSchema } from "../clinical/medications";
import {
  clinicalInvestigationSchema,
  clinicalNoteSchema,
  generalExaminationSchema,
  systemicExaminationSchema,
} from "../clinical/clinical";
import { cptCodeSchema, icdCodeSchema } from "../shared/medical-coding";
import { stripHtmlTags } from "../api/sanitization";
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
    ROUTINE: "badge-info",
    URGENT: "badge-warning",
    EMERGENCY: "badge-danger",
  };

export const appointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Select a patient."),
  doctorId: z.string().min(1, "Select a doctor."),
  clinicId: z.string().min(1, "Select a clinic."),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: appointmentStatusSchema,
  type: appointmentTypeSchema,
  priority: appointmentPrioritySchema.default("ROUTINE").optional(),

  consultationNotes: z.string().max(10000).optional().transform(stripHtmlTags), 

  notes: z.string().max(2000).optional().transform(stripHtmlTags),
  observations: z.string().max(2000).optional().transform(stripHtmlTags),

  chiefComplaint: z.string().max(1000).optional().transform(stripHtmlTags), 
  historyOfPresentIllness: z
    .string()
    .max(5000)
    .optional()
    .transform(stripHtmlTags), 
  pastMedicalHistory: z.string().max(5000).optional().transform(stripHtmlTags), 
  reviewOfSystems: z.string().max(5000).optional().transform(stripHtmlTags), 

  generalExamination: generalExaminationSchema.optional(), 
  systemicExamination: systemicExaminationSchema.optional(), 

  provisionalDiagnosis: z
    .string()
    .max(1000)
    .optional()
    .transform(stripHtmlTags), 
  differentialDiagnosis: z
    .string()
    .max(2000)
    .optional()
    .transform(stripHtmlTags), 
  clinicalImpression: z.string().max(2000).optional().transform(stripHtmlTags), 

  investigations: z.array(clinicalInvestigationSchema).optional(), 
  finalDiagnosis: z.string().max(1000).optional().transform(stripHtmlTags), 
  treatmentPlan: z.string().max(5000).optional().transform(stripHtmlTags), 
  followUpPlan: z.string().max(2000).optional().transform(stripHtmlTags), 

  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),

  patient: patientSchema.optional(),
  doctor: z.object({ name: z.string().max(100) }).optional(),
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

export const createAppointmentSchema = appointmentSchema.omit({
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
