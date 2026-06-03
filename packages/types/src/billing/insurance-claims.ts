import { z } from "zod";
import { stripHtmlTags } from "../api/sanitization";

/**
 * Insurance claim contracts (single source of truth).
 *
 * Models the Indian cashless/reimbursement lifecycle, discriminated by
 * {@link claimTypeSchema}: a PRE_AUTH claim is raised from an appointment
 * before the final bill exists; a REIMBURSEMENT claim is raised against the
 * final invoice and may be approved only in part (the remainder becomes the
 * patient's responsibility). Amounts are stored in integer minor units
 * (paise/cents) to match the persisted `*Cents` columns on Invoice.
 */

export const claimTypeSchema = z.enum(["PRE_AUTH", "REIMBURSEMENT"]);
export type ClaimType = z.infer<typeof claimTypeSchema>;

export const claimStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "INFO_REQUESTED",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "DENIED",
  "SETTLED",
  "CANCELLED",
  "APPEALED",
]);
export type ClaimStatus = z.infer<typeof claimStatusSchema>;

/** Non-negative integer minor-currency-unit amount (paise/cents). */
const amountCentsSchema = z.number().int().min(0);

/** Patient summary embedded on claim detail/list rows (not the full patient). */
export const claimPatientSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().nullable().optional(),
});

export const claimDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  mimeType: z.string(),
  createdAt: z.string().or(z.date()),
});
export type ClaimDocument = z.infer<typeof claimDocumentSchema>;

export const insuranceClaimSchema = z.object({
  id: z.string().optional(),
  claimNumber: z.string().max(32).nullable().optional(),
  claimType: claimTypeSchema,
  status: claimStatusSchema,
  patientId: z.string(),
  clinicId: z.string().nullable().optional(),
  appointmentId: z.string().nullable().optional(),
  invoiceId: z.string().nullable().optional(),
  parentClaimId: z.string().nullable().optional(),
  insurerName: z.string().min(1).max(200).transform(stripHtmlTags),
  tpaName: z.string().max(200).transform(stripHtmlTags).nullable().optional(),
  policyNumber: z.string().min(1).max(100).transform(stripHtmlTags),
  groupNumber: z.string().max(100).transform(stripHtmlTags).nullable().optional(),
  currency: z.string().length(3).optional(),
  claimedAmountCents: amountCentsSchema,
  approvedAmountCents: amountCentsSchema.nullable().optional(),
  patientResponsibilityCents: amountCentsSchema.nullable().optional(),
  submittedAt: z.string().or(z.date()).nullable().optional(),
  respondedAt: z.string().or(z.date()).nullable().optional(),
  settledAt: z.string().or(z.date()).nullable().optional(),
  notes: z.string().max(2000).transform(stripHtmlTags).nullable().optional(),
  denialReason: z.string().max(1000).transform(stripHtmlTags).nullable().optional(),
  version: z.number().int().min(1).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  patient: claimPatientSchema.nullish().optional(),
  documents: z.array(claimDocumentSchema).optional(),
});
export type InsuranceClaim = z.infer<typeof insuranceClaimSchema>;

/** POST /insurance-claims body. Status/number/timestamps are server-assigned. */
export const createInsuranceClaimSchema = insuranceClaimSchema.omit({
  id: true,
  claimNumber: true,
  status: true,
  clinicId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  patient: true,
  documents: true,
});
export type CreateInsuranceClaimInput = z.infer<
  typeof createInsuranceClaimSchema
>;

/** PATCH /insurance-claims/:id body. `version` is required for optimistic locking. */
export const updateInsuranceClaimSchema = createInsuranceClaimSchema
  .omit({ patientId: true })
  .partial()
  .extend({ version: z.number().int().min(1) });
export type UpdateInsuranceClaimInput = z.infer<
  typeof updateInsuranceClaimSchema
>;

/** POST /insurance-claims/:id/transition body. */
export const claimStatusTransitionSchema = z.object({
  targetStatus: claimStatusSchema,
  approvedAmountCents: amountCentsSchema.optional(),
  patientResponsibilityCents: amountCentsSchema.optional(),
  denialReason: z.string().max(1000).transform(stripHtmlTags).optional(),
  note: z.string().max(2000).transform(stripHtmlTags).optional(),
  version: z.number().int().min(1),
});
export type ClaimStatusTransitionInput = z.infer<
  typeof claimStatusTransitionSchema
>;

export const paginatedInsuranceClaimListResponseSchema = z.object({
  items: z.array(insuranceClaimSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().optional(),
});
export type PaginatedInsuranceClaimListResponse = z.infer<
  typeof paginatedInsuranceClaimListResponseSchema
>;

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  INFO_REQUESTED: "Info requested",
  APPROVED: "Approved",
  PARTIALLY_APPROVED: "Partially approved",
  DENIED: "Denied",
  SETTLED: "Settled",
  CANCELLED: "Cancelled",
  APPEALED: "Appealed",
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  PRE_AUTH: "Pre-authorization",
  REIMBURSEMENT: "Reimbursement",
};

export const CLAIM_STATUS_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: [
    "INFO_REQUESTED",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "DENIED",
    "CANCELLED",
  ],
  INFO_REQUESTED: [
    "SUBMITTED",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "DENIED",
    "CANCELLED",
  ],
  APPROVED: ["SETTLED", "APPEALED", "CANCELLED"],
  PARTIALLY_APPROVED: ["SETTLED", "APPEALED", "CANCELLED"],
  DENIED: ["APPEALED", "CANCELLED"],
  APPEALED: [
    "SUBMITTED",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "DENIED",
    "CANCELLED",
  ],
  SETTLED: [],
  CANCELLED: [],
};

export const badgeToneSchema = z.enum([
  "default",
  "secondary",
  "outline",
  "destructive",
]);
export type BadgeTone = z.infer<typeof badgeToneSchema>;

export const CLAIM_STATUS_TONE: Record<ClaimStatus, BadgeTone> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  INFO_REQUESTED: "secondary",
  APPROVED: "default",
  PARTIALLY_APPROVED: "default",
  DENIED: "destructive",
  SETTLED: "default",
  CANCELLED: "outline",
  APPEALED: "secondary",
};
