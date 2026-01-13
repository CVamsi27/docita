import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { appointmentSchema, vitalSignSchema } from '@workspace/types';

// Create schema derived from workspace types but adapted for API input
const CreateAppointmentSchema = appointmentSchema
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

// For updates, we allow partial fields and include clinical documentation fields
// Since the 'appointmentSchema' might not have all the clinical fields flattened, we might need a looser schema or extend it.
// Given the large number of fields in the existing interface, we'll make a schema that allows unknown keys for now or define them if known.
// Ideally, we extend the base schema.

const UpdateAppointmentSchema = CreateAppointmentSchema.partial().extend({
  consultationNotes: z.string().optional(),
  chiefComplaint: z.string().optional(),
  treatmentHistory: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  reviewOfSystems: z.string().optional(),
  generalExamination: z.any().optional(),
  systemicExamination: z.any().optional(),
  dentalChart: z.any().optional(),
  growthData: z.any().optional(),
  ophthalmologyExam: z.any().optional(),
  cardiologyExam: z.any().optional(),
  gynecologyExam: z.any().optional(),
  dermatologyExam: z.any().optional(),
  psychiatryExam: z.any().optional(),
  provisionalDiagnosis: z.string().optional(),
  differentialDiagnosis: z.string().optional(),
  clinicalImpression: z.string().optional(),
  investigations: z.any().optional(),
  finalDiagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpPlan: z.string().optional(),
});

export class UpdateAppointmentDto extends createZodDto(
  UpdateAppointmentSchema,
) {}

// Vitals DTO - Recreating manually to avoid omit issues with imported schema
const VitalsSchema = z.object({
  height: z.number().optional(),
  weight: z.number().optional(),
  bmi: z.number().optional(),
  bloodPressure: z.string().optional(),
  pulse: z.number().optional(),
  respiratoryRate: z.number().optional(),
  temperature: z.number().optional(),
  spo2: z.number().optional(),
  painScore: z.number().optional(),
  bloodGlucose: z.number().optional(),
  notes: z.string().optional(),
});

export class VitalsDto extends createZodDto(VitalsSchema) {}

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
