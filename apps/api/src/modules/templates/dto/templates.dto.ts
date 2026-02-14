import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Schema for template fields
const TemplateFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.string().min(1),
  options: z.array(z.string()).optional(),
});

// Create Template Schema
export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name required'),
  speciality: z.string().min(1, 'Speciality required'),
  fields: z
    .array(TemplateFieldSchema)
    .min(1, 'At least one field required'),
  defaultObservations: z.string().optional(),
  clinicId: z.string().optional(),
});

export class CreateTemplateDto extends createZodDto(CreateTemplateSchema) {}

// Update Template Schema
export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export class UpdateTemplateDto extends createZodDto(UpdateTemplateSchema) {}
