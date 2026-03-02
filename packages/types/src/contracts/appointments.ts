import { z } from "zod";
import {
  appointmentSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "../operations/appointments";

export const appointmentResponseSchema = appointmentSchema;

export const createAppointmentRequestSchema = createAppointmentSchema.extend({
  clinicId: createAppointmentSchema.shape.clinicId.optional(),
});

export const updateAppointmentRequestSchema = updateAppointmentSchema.extend({
  consultationNotes: z.string().optional(),
  chiefComplaint: z.string().optional(),
  treatmentHistory: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  reviewOfSystems: z.string().optional(),
  generalExamination: z.unknown().optional(),
  systemicExamination: z.unknown().optional(),
  dentalChart: z.unknown().optional(),
  growthData: z.unknown().optional(),
  ophthalmologyExam: z.unknown().optional(),
  cardiologyExam: z.unknown().optional(),
  gynecologyExam: z.unknown().optional(),
  dermatologyExam: z.unknown().optional(),
  psychiatryExam: z.unknown().optional(),
  provisionalDiagnosis: z.string().optional(),
  differentialDiagnosis: z.string().optional(),
  clinicalImpression: z.string().optional(),
  investigations: z.array(z.unknown()).optional(),
  finalDiagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpPlan: z.string().optional(),
});

export const listAppointmentsQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const normalizeDate = (
  value: string | Date | undefined,
): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
};

export const appointmentDomainCreateSchema = createAppointmentRequestSchema
  .extend({
    clinicId: z.string().min(1),
  })
  .transform((input) => ({
    clinicId: input.clinicId,
    patientId: input.patientId,
    doctorId: input.doctorId,
    startTime: normalizeDate(input.startTime) as Date,
    endTime: normalizeDate(input.endTime) as Date,
    reason: input.notes,
    type: input.type,
  }));

export const appointmentCancelRequestSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

export const appointmentRescheduleRequestSchema = z
  .object({
    startTime: z.union([z.string(), z.date()]),
    endTime: z.union([z.string(), z.date()]),
  })
  .transform((input) => ({
    startTime: normalizeDate(input.startTime) as Date,
    endTime: normalizeDate(input.endTime) as Date,
  }));

export type AppointmentContractResponse = z.infer<typeof appointmentResponseSchema>;
export type CreateAppointmentRequest = z.infer<
  typeof createAppointmentRequestSchema
>;
export type UpdateAppointmentRequest = z.infer<
  typeof updateAppointmentRequestSchema
>;
export type ListAppointmentsContractQuery = z.infer<
  typeof listAppointmentsQuerySchema
>;
export type AppointmentDomainCreateInput = z.output<
  typeof appointmentDomainCreateSchema
>;
export type AppointmentCancelRequest = z.infer<
  typeof appointmentCancelRequestSchema
>;
export type AppointmentRescheduleRequest = z.output<
  typeof appointmentRescheduleRequestSchema
>;
