import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Resolve Multiple Errors Schema
export const ResolveMultipleErrorsSchema = z.object({
  errorIds: z.array(z.string().min(1)).min(1, 'At least one error ID required'),
  resolvedBy: z.string().min(1, 'Resolver name/ID required'),
});

export class ResolveMultipleErrorsDto extends createZodDto(
  ResolveMultipleErrorsSchema,
) {}

// Archive Schema
export const ArchiveErrorsSchema = z.object({
  auditDays: z.number().int().positive().optional().default(90),
  whatsappDays: z.number().int().positive().optional().default(180),
  appointmentYears: z.number().int().positive().optional().default(2),
});

export class ArchiveErrorsDto extends createZodDto(ArchiveErrorsSchema) {}
