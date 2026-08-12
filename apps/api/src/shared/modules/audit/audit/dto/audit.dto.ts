import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { auditLogSchema, auditLogFilterSchema } from '@workspace/types';

export class AuditLogFilterDto extends createZodDto(auditLogFilterSchema) {}

export class AuditLogResponseDto extends createZodDto(auditLogSchema) {}
export class AuditLogListResponseDto extends createZodDto(
  z.array(auditLogSchema),
) {}

export const paginatedAuditLogSchema = z.object({
  data: z.array(auditLogSchema),
  total: z.number(),
  page: z.number().optional(),
  limit: z.number().optional(),
});
export class PaginatedAuditLogResponseDto extends createZodDto(
  paginatedAuditLogSchema,
) {}
