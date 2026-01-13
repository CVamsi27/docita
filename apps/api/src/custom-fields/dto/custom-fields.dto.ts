import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { customFieldSchema } from '@workspace/types';

export const CreateCustomFieldSchema = z.object({
  name: z.string().min(1),
  fieldType: z.string().min(1),
  options: z.string().optional(),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
});

export class CreateCustomFieldDto extends createZodDto(
  CreateCustomFieldSchema,
) {}

export const UpdateCustomFieldSchema = CreateCustomFieldSchema.partial();
export class UpdateCustomFieldDto extends createZodDto(
  UpdateCustomFieldSchema,
) {}

export class CustomFieldResponseDto extends createZodDto(customFieldSchema) {}
export class CustomFieldListResponseDto extends createZodDto(
  z.array(customFieldSchema),
) {}
