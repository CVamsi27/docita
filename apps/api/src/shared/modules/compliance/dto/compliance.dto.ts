import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const DeletePatientDataSchema = z.object({
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .describe('Reason for data deletion (audit trail)'),
  requestedBy: z
    .string()
    .min(1, 'RequestedBy is required')
    .describe('User ID or name of person making the request'),
});

export class DeletePatientDataDto extends createZodDto(
  DeletePatientDataSchema,
) {}

export const EmergencyAccessSchema = z.object({
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .describe('Reason for emergency access (must be specific and detailed)'),
  requestedBy: z
    .string()
    .min(1, 'RequestedBy is required')
    .describe('User ID or name making the emergency access request'),
});

export class EmergencyAccessDto extends createZodDto(EmergencyAccessSchema) {}
