import {
  ClaimStatus,
  ClaimSubmissionStatus,
  ClaimType,
  Prisma,
} from '@workspace/db';

/**
 * A claim the delivery sweep owes work on.
 *
 * `clinicId` is the clinic that owns the claim, resolved the same way the
 * ownership filter resolves it: a claim with no direct clinic belongs to its
 * patient's clinic. The sweep runs without an authenticated clinic, so it has
 * to carry the owning clinic itself rather than filtering by one.
 */
export interface PendingClaimSubmission {
  id: string;
  clinicId: string;
  submissionAttempts: number;
}

/**
 * Settlement of one delivery attempt, recorded once the caller still holds the
 * claim token. Shared by the repository interface and its Prisma
 * implementation so both agree on what a settled submission stores.
 */
export interface ClaimSubmissionOutcome {
  status: ClaimSubmissionStatus;
  now: Date;
  externalReference?: string | null;
  error?: string | null;
}

export interface ClaimPatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
}

export interface ClaimDocumentSummary {
  id: string;
  name: string;
  type: string;
  url: string;
  mimeType: string;
  createdAt: Date;
}

export interface InsuranceClaimRecord {
  id: string;
  claimNumber: string | null;
  claimType: ClaimType;
  status: ClaimStatus;
  patientId: string;
  clinicId: string | null;
  appointmentId: string | null;
  invoiceId: string | null;
  parentClaimId: string | null;
  insurerName: string;
  tpaName: string | null;
  policyNumber: string;
  groupNumber: string | null;
  currency: string;
  claimedAmountCents: number;
  approvedAmountCents: number | null;
  patientResponsibilityCents: number | null;
  submittedAt: Date | null;
  respondedAt: Date | null;
  settledAt: Date | null;
  notes: string | null;
  denialReason: string | null;
  submissionStatus: ClaimSubmissionStatus;
  submissionAttempts: number;
  submissionClaimedAt: Date | null;
  submittedToInsurerAt: Date | null;
  submissionLastError: string | null;
  externalClaimReference: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  patient?: ClaimPatientSummary | null;
  documents?: ClaimDocumentSummary[];
}

export interface InsuranceClaimSearchParams {
  clinicId: string;
  patientId?: string;
  invoiceId?: string;
  status?: ClaimStatus;
  // jscpd:ignore-start
  claimType?: ClaimType;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export interface IInsuranceClaimRepository {
  // jscpd:ignore-end
  findAll(
    params: InsuranceClaimSearchParams,
  ): Promise<PaginatedResult<InsuranceClaimRecord>>;
  findById(id: string, clinicId: string): Promise<InsuranceClaimRecord | null>;
  findByIdempotencyKey(
    key: string,
    clinicId: string,
  ): Promise<InsuranceClaimRecord | null>;
  create(
    data: Prisma.InsuranceClaimUncheckedCreateInput,
  ): Promise<InsuranceClaimRecord>;
  update(
    id: string,
    clinicId: string,
    expectedVersion: number,
    data: Prisma.InsuranceClaimUncheckedUpdateManyInput,
  ): Promise<InsuranceClaimRecord | null>;
  /** Applies a status change and records an audit event atomically. */
  transition(
    id: string,
    clinicId: string,
    expectedVersion: number,
    data: Prisma.InsuranceClaimUncheckedUpdateManyInput,
    event: Prisma.InsuranceClaimEventCreateWithoutClaimInput,
  ): Promise<InsuranceClaimRecord | null>;

  /**
   * Claims the delivery of a claim to its insurer.
   *
   * Bounded by a lease so a process that died mid-send does not strand the
   * claim, and so two workers never file the same claim twice. The claim's own
   * status is not touched here: what is being claimed is delivery, which is a
   * separate fact from "marked submitted".
   */
  claimSubmission(
    id: string,
    clinicId: string,
    claimToken: string,
    now: Date,
    leaseExpiredBefore: Date,
  ): Promise<boolean>;

  /** Settles a submission the caller still holds the claim on. */
  settleSubmission(
    id: string,
    clinicId: string,
    claimToken: string,
    outcome: ClaimSubmissionOutcome,
  ): Promise<void>;

  /** Claims whose delivery to the insurer has not been confirmed. */
  findPendingSubmissions(
    leaseExpiredBefore: Date,
    limit: number,
  ): Promise<PendingClaimSubmission[]>;
  attachDocument(
    claimId: string,
    clinicId: string,
    patientId: string,
    documentId: string,
  ): Promise<boolean>;
  findAttachableDocuments(
    patientId: string,
    clinicId: string,
  ): Promise<ClaimDocumentSummary[]>;
  patientBelongsToClinic(patientId: string, clinicId: string): Promise<boolean>;
  referencesBelongToPatientClinic(params: {
    patientId: string;
    clinicId: string;
    appointmentId?: string | null;
    invoiceId?: string | null;
    parentClaimId?: string | null;
  }): Promise<boolean>;
}

export const INSURANCE_CLAIM_REPOSITORY_TOKEN = Symbol(
  'IInsuranceClaimRepository',
);
