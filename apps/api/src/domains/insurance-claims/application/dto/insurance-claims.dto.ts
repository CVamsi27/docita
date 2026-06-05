import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  claimStatusSchema,
  claimStatusTransitionSchema,
  claimDocumentSchema,
  claimTypeSchema,
  createInsuranceClaimSchema,
  insuranceClaimSchema,
  paginatedInsuranceClaimListResponseSchema,
  updateInsuranceClaimSchema,
} from '@workspace/types';

export class CreateInsuranceClaimDto extends createZodDto(
  createInsuranceClaimSchema,
) {}

export class UpdateInsuranceClaimDto extends createZodDto(
  updateInsuranceClaimSchema,
) {}

export class ClaimStatusTransitionDto extends createZodDto(
  claimStatusTransitionSchema,
) {}

export const listInsuranceClaimsQuerySchema = z.object({
  patientId: z.string().optional(),
  invoiceId: z.string().optional(),
  status: claimStatusSchema.optional(),
  claimType: claimTypeSchema.optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export class ListInsuranceClaimsQueryDto extends createZodDto(
  listInsuranceClaimsQuerySchema,
) {}

export const attachClaimDocumentSchema = z.object({
  documentId: z.string().min(1),
});
export class AttachClaimDocumentDto extends createZodDto(
  attachClaimDocumentSchema,
) {}

export class InsuranceClaimResponseDto extends createZodDto(
  insuranceClaimSchema,
) {}

export class PaginatedInsuranceClaimResponseDto extends createZodDto(
  paginatedInsuranceClaimListResponseSchema,
) {}

export class AttachableClaimDocumentsResponseDto extends createZodDto(
  z.array(claimDocumentSchema),
) {}
