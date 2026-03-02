import { createZodDto } from 'nestjs-zod';
import {
  createTemplateRequestSchema,
  updateTemplateRequestSchema,
  listTemplatesQuerySchema,
} from '@workspace/types';

export const CreateTemplateSchema = createTemplateRequestSchema;

export class CreateTemplateDto extends createZodDto(CreateTemplateSchema) {}

export const UpdateTemplateSchema = updateTemplateRequestSchema;

export class UpdateTemplateDto extends createZodDto(UpdateTemplateSchema) {}

export const ListTemplatesQuerySchema = listTemplatesQuerySchema;

export class ListTemplatesQueryDto extends createZodDto(
  ListTemplatesQuerySchema,
) {}
