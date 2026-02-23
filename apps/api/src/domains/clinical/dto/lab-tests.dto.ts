import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { labTestSchema, labTestOrderSchema } from '@workspace/types';

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
  status: z.string().optional(),
  result: z.record(z.unknown()).optional(),
  resultUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export class UpdateLabTestOrderDto extends createZodDto(
  UpdateLabTestOrderSchema,
) {}

export class LabTestResponseDto extends createZodDto(labTestSchema) {}
export class LabTestListResponseDto extends createZodDto(
  z.array(labTestSchema),
) {}
export class LabTestOrderResponseDto extends createZodDto(labTestOrderSchema) {}
export class LabTestOrderListResponseDto extends createZodDto(
  z.array(labTestOrderSchema),
) {}
