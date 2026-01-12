import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateLabTestSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  category: z.string().min(1),
  price: z.number().positive().optional(),
  description: z.string().optional(),
});

export class CreateLabTestDto extends createZodDto(CreateLabTestSchema) {}

export const CreateLabTestOrderSchema = z.object({
  patientId: z.string(),
  labTestId: z.string(),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export class CreateLabTestOrderDto extends createZodDto(
  CreateLabTestOrderSchema,
) {}

export const UpdateLabTestOrderSchema = z.object({
  status: z.string().optional(), // Could be enum
  result: z.record(z.unknown()).optional(), // Loose for now, could be stricter
  resultUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export class UpdateLabTestOrderDto extends createZodDto(
  UpdateLabTestOrderSchema,
) {}
