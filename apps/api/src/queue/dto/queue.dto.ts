import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateQueueTokenSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  doctorId: z.string().optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
});
export class CreateQueueTokenDto extends createZodDto(CreateQueueTokenSchema) {}

export const UpdateQueueTokenSchema = z.object({
  status: z.string().optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
});
export class UpdateQueueTokenDto extends createZodDto(UpdateQueueTokenSchema) {}

export const UpdateQueueSettingsSchema = z.object({
  queueBufferMinutes: z.number().int().nonnegative().optional(),
  useDoctorQueues: z.boolean().optional(),
  lateArrivalGraceMinutes: z.number().int().nonnegative().optional(),
  avgConsultationMinutes: z.number().int().positive().optional(),
});
export class UpdateQueueSettingsDto extends createZodDto(
  UpdateQueueSettingsSchema,
) {}
