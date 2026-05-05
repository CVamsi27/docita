import { createZodDto } from 'nestjs-zod';
import { bulkImportJobStatusResponseSchema } from '@workspace/types';

export class BulkImportJobStatusResponseDto extends createZodDto(
  bulkImportJobStatusResponseSchema,
) {}
