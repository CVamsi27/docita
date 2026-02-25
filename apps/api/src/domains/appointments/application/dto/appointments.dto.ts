import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  appointmentSchema,
  vitalSignSchema,
  generalExaminationSchema,
  systemicExaminationSchema,
  clinicalInvestigationSchema,
} from '@workspace/types';

export const CreateAppointmentSchema = appointmentSchema
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
  })
  .extend({
    clinicId: appointmentSchema.shape.clinicId.optional(),
  });

export class CreateAppointmentDto extends createZodDto(
  CreateAppointmentSchema,
) {}

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial().extend(
  {
    consultationNotes: z.string().optional(),
    chiefComplaint: z.string().optional(),
    treatmentHistory: z.string().optional(),
    historyOfPresentIllness: z.string().optional(),
    pastMedicalHistory: z.string().optional(),
    reviewOfSystems: z.string().optional(),
    generalExamination: generalExaminationSchema.optional(),
    systemicExamination: systemicExaminationSchema.optional(),
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
    investigations: z.array(clinicalInvestigationSchema).optional(),
    finalDiagnosis: z.string().optional(),
    treatmentPlan: z.string().optional(),
    followUpPlan: z.string().optional(),
  },
);

export class UpdateAppointmentDto extends createZodDto(
  UpdateAppointmentSchema,
) {}

export class VitalsDto extends createZodDto(vitalSignSchema) {}

export class AppointmentResponseDto extends createZodDto(appointmentSchema) {}

const PaginatedAppointmentResponseSchema = z.object({
  items: z.array(appointmentSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().optional(),
});
export class PaginatedAppointmentResponseDto extends createZodDto(
  PaginatedAppointmentResponseSchema,
) {}

export class VitalSignResponseDto extends createZodDto(vitalSignSchema) {}
