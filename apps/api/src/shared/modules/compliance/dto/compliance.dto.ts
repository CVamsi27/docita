import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTO for patient data deletion request (DPDP Act compliance)
 * This is used for the erasure workflow in the Indian privacy law
 */
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

/**
 * DTO for emergency access request with break-the-glass logging
 * Used for HIPAA/DPDP emergency access scenarios
 */
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
