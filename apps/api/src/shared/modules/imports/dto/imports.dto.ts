import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { importJobSchema } from '@workspace/types';

export const ImportPreviewResponseSchema = z.object({
  sessionId: z.string(),
  columns: z.array(z.string()),
  previewData: z.array(z.record(z.unknown())),
  totalRows: z.number(),
});
export class ImportPreviewResponseDto extends createZodDto(
  ImportPreviewResponseSchema,
) {}

export const ImportPatientFieldsResponseSchema = z.object({
  fields: z.array(
    z.object({
      field: z.string(),
      aliases: z.array(z.string()),
      required: z.boolean(),
    }),
  ),
});
export class ImportPatientFieldsResponseDto extends createZodDto(
  ImportPatientFieldsResponseSchema,
) {}

export const ImportResultSchema = z.object({
  success: z.boolean(),
  jobId: z.string().optional(),
  processed: z.number().int().optional(),
  successful: z.number().int().optional(),
  failed: z.number().int().optional(),
  errors: z.array(z.unknown()).optional(),
});
export class ImportResultResponseDto extends createZodDto(ImportResultSchema) {}

export const OcrResultSchema = z.object({
  text: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});
export class OcrResultResponseDto extends createZodDto(OcrResultSchema) {}

export class ImportJobResponseDto extends createZodDto(importJobSchema) {}

export const ColumnMappingRequestSchema = z.object({
  columnMapping: z.record(z.string(), z.string()).optional(),
});
export class ColumnMappingRequestDto extends createZodDto(
  ColumnMappingRequestSchema,
) {}
