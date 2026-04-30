import { z } from "zod";
import {
  appointmentSchema,
  createAppointmentBaseSchema,
  updateAppointmentSchema,
} from "../operations/appointments";
import { stripHtmlTags } from "../api/sanitization";
import { appointmentStatusSchema } from "../shared/users";
import {
  cardiologyExamDataSchema,
  clinicalInvestigationSchema,
  dentalChartSchema,
  dermatologyExamDataSchema,
  generalExaminationSchema,
  growthChartDataSchema,
  gynecologyExamDataSchema,
  ophthalmologyExamDataSchema,
  psychiatryExamDataSchema,
  systemicExaminationSchema,
} from "../clinical/clinical";

export const appointmentResponseSchema = appointmentSchema;

export const startConsultationResponseSchema = z.object({
  appointmentId: z.string().min(1),
  status: appointmentStatusSchema,
});

export const createAppointmentRequestSchema = createAppointmentBaseSchema.extend({
  clinicId: createAppointmentBaseSchema.shape.clinicId.optional(),
});

export const updateAppointmentRequestSchema = updateAppointmentSchema.extend({
  consultationNotes: z.string().optional(),
  chiefComplaint: z.string().optional(),
  treatmentHistory: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  reviewOfSystems: z.string().optional(),
  generalExamination: generalExaminationSchema.optional(),
  systemicExamination: systemicExaminationSchema.optional(),
  dentalChart: dentalChartSchema.optional(),
  growthData: growthChartDataSchema.optional(),
  ophthalmologyExam: ophthalmologyExamDataSchema.optional(),
  cardiologyExam: cardiologyExamDataSchema.optional(),
  gynecologyExam: gynecologyExamDataSchema.optional(),
  dermatologyExam: dermatologyExamDataSchema.optional(),
  psychiatryExam: psychiatryExamDataSchema.optional(),
  provisionalDiagnosis: z.string().optional(),
  differentialDiagnosis: z.string().optional(),
  clinicalImpression: z.string().optional(),
  investigations: z.array(clinicalInvestigationSchema).optional(),
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
  reason: z.string().min(1, "Enter a reason for canceling the appointment."),
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

export const followUpStatusSchema = z.enum([
  "PENDING",
  "REMINDER_SENT",
  "BOOKED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const followUpResponseSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  clinicId: z.string(),
  scheduledDate: z.string().or(z.date()),
  reason: z.string(),
  status: followUpStatusSchema,
  reminderSentAt: z.string().or(z.date()).nullable().optional(),
  bookedAppointmentId: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  patient: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      phoneNumber: z.string().nullable().optional(),
    })
    .optional(),
  doctor: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .optional(),
});

export const createFollowUpRequestSchema = z.object({
  patientId: z.string().min(1, "Select a patient."),
  doctorId: z.string().min(1, "Select a doctor."),
  scheduledDate: z.string().min(1, "Choose a follow-up date."),
  reason: z.string().trim().min(2).max(500).transform(stripHtmlTags),
});

export const listFollowUpsQuerySchema = z.object({
  appointmentId: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const bookFollowUpRequestSchema = z.object({
  bookedAppointmentId: z.string().min(1, "Select the booked appointment."),
});

export const appointmentRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const patientAppointmentRequestCreateSchema = z.object({
  preferredDoctorId: z.string().min(1).optional(),
  preferredDate: z.string().min(1, "Choose a preferred date."),
  preferredTime: z.string().trim().max(20).optional(),
  reason: z.string().trim().min(2).max(500).transform(stripHtmlTags),
  notes: z.string().trim().max(1000).transform(stripHtmlTags).optional(),
});

export const listAppointmentRequestsQuerySchema = z.object({
  status: appointmentRequestStatusSchema.optional(),
  patientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const approveAppointmentRequestSchema = z.object({
  doctorId: z.string().min(1, "Select a doctor."),
  startTime: z.string().min(1, "Choose a start time."),
  endTime: z.string().min(1, "Choose an end time."),
  type: z.string().trim().max(80).transform(stripHtmlTags).optional(),
  notes: z.string().trim().max(1000).transform(stripHtmlTags).optional(),
});

export const rejectAppointmentRequestSchema = z.object({
  responseMessage: z
    .string()
    .trim()
    .min(2, "Enter a response for the patient.")
    .max(1000)
    .transform(stripHtmlTags),
});

export const appointmentRequestResponseSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  clinicId: z.string(),
  preferredDoctorId: z.string().nullable().optional(),
  preferredDate: z.string().or(z.date()),
  preferredTime: z.string().nullable().optional(),
  reason: z.string(),
  notes: z.string().nullable().optional(),
  status: appointmentRequestStatusSchema,
  reviewedById: z.string().nullable().optional(),
  reviewedAt: z.string().or(z.date()).nullable().optional(),
  responseMessage: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  patient: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      phoneNumber: z.string().nullable().optional(),
    })
    .optional(),
  preferredDoctor: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  reviewedBy: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const appointmentRequestListResponseSchema = z.object({
  items: z.array(appointmentRequestResponseSchema),
  count: z.number(),
  hasMore: z.boolean(),
});

export type AppointmentContractResponse = z.infer<typeof appointmentResponseSchema>;
export type StartConsultationResponse = z.infer<
  typeof startConsultationResponseSchema
>;
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
export type FollowUpStatus = z.infer<typeof followUpStatusSchema>;
export type FollowUpResponse = z.infer<typeof followUpResponseSchema>;
export type CreateFollowUpRequest = z.infer<typeof createFollowUpRequestSchema>;
export type ListFollowUpsQuery = z.infer<typeof listFollowUpsQuerySchema>;
export type BookFollowUpRequest = z.infer<typeof bookFollowUpRequestSchema>;
export type AppointmentRequestStatus = z.infer<
  typeof appointmentRequestStatusSchema
>;
export type PatientAppointmentRequestCreate = z.infer<
  typeof patientAppointmentRequestCreateSchema
>;
export type ListAppointmentRequestsQuery = z.infer<
  typeof listAppointmentRequestsQuerySchema
>;
export type ApproveAppointmentRequest = z.infer<
  typeof approveAppointmentRequestSchema
>;
export type RejectAppointmentRequest = z.infer<
  typeof rejectAppointmentRequestSchema
>;
export type AppointmentRequestResponse = z.infer<
  typeof appointmentRequestResponseSchema
>;
export type AppointmentRequestListResponse = z.infer<
  typeof appointmentRequestListResponseSchema
>;
