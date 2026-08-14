import { ClaimStatus, ClaimType, Prisma } from '@workspace/db';

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
