import { Injectable } from '@nestjs/common';
import { ClaimStatus, ClaimSubmissionStatus, Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ClaimSubmissionOutcome,
  IInsuranceClaimRepository,
  InsuranceClaimRecord,
  InsuranceClaimSearchParams,
  PaginatedResult,
  PendingClaimSubmission,
} from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';

const CLAIM_DOCUMENT_SELECT = {
  id: true,
  name: true,
  type: true,
  url: true,
  mimeType: true,
  createdAt: true,
} satisfies Prisma.DocumentSelect;

const CLAIM_SELECT = {
  id: true,
  claimNumber: true,
  claimType: true,
  status: true,
  patientId: true,
  clinicId: true,
  appointmentId: true,
  invoiceId: true,
  parentClaimId: true,
  insurerName: true,
  tpaName: true,
  policyNumber: true,
  groupNumber: true,
  currency: true,
  claimedAmountCents: true,
  approvedAmountCents: true,
  patientResponsibilityCents: true,
  submittedAt: true,
  respondedAt: true,
  settledAt: true,
  notes: true,
  denialReason: true,
  submissionStatus: true,
  submissionAttempts: true,
  submissionClaimedAt: true,
  submittedToInsurerAt: true,
  submissionLastError: true,
  externalClaimReference: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
    },
  },
  documents: {
    select: CLAIM_DOCUMENT_SELECT,
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.InsuranceClaimSelect;

type InsuranceClaimListRow = Prisma.InsuranceClaimGetPayload<{
  select: typeof CLAIM_SELECT;
}>;

function toInsuranceClaimRecord(
  row: InsuranceClaimListRow,
): InsuranceClaimRecord {
  return row;
}

@Injectable()
export class PrismaInsuranceClaimRepository implements IInsuranceClaimRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  private ownershipFilter(clinicId: string): Prisma.InsuranceClaimWhereInput {
    return { OR: [{ clinicId }, { clinicId: null, patient: { clinicId } }] };
  }

  async findAll(
    params: InsuranceClaimSearchParams,
  ): Promise<PaginatedResult<InsuranceClaimRecord>> {
    const {
      clinicId,
      patientId,
      invoiceId,
      status,
      // jscpd:ignore-start
      claimType,
      search,
      cursor,
      limit,
    } = params;

    if (!clinicId) {
      return { items: [], nextCursor: undefined, hasMore: false, count: 0 };
    }

    const filters: Prisma.InsuranceClaimWhereInput[] = [
      // jscpd:ignore-end
      this.ownershipFilter(clinicId),
    ];
    if (patientId) filters.push({ patientId });
    if (invoiceId) filters.push({ invoiceId });
    if (status) filters.push({ status });
    if (claimType) filters.push({ claimType });
    if (search) {
      filters.push({
        OR: [
          { insurerName: { contains: search, mode: 'insensitive' } },
          { policyNumber: { contains: search, mode: 'insensitive' } },
          { claimNumber: { contains: search, mode: 'insensitive' } },
          {
            patient: {
              clinicId,
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      });
    }

    const where: Prisma.InsuranceClaimWhereInput = { AND: filters };
    const readClient = this.getReadClient();
    const safeLimit = Math.min(limit || 20, 100);
    const query = {
      take: safeLimit + 1,
      where,
      orderBy: { createdAt: 'desc' },
      select: CLAIM_SELECT,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    } satisfies Prisma.InsuranceClaimFindManyArgs;

    const rows = await readClient.insuranceClaim.findMany(query);
    const hasMore = rows.length > safeLimit;
    // jscpd:ignore-start
    const items = rows.slice(0, safeLimit).map(toInsuranceClaimRecord);

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id : undefined,
      hasMore,
      count: items.length,
    };
  }

  async findById(
    // jscpd:ignore-end
    id: string,
    clinicId: string,
  ): Promise<InsuranceClaimRecord | null> {
    return this.getReadClient().insuranceClaim.findFirst({
      where: { id, ...this.ownershipFilter(clinicId) },
      select: CLAIM_SELECT,
    });
  }

  async findByIdempotencyKey(
    key: string,
    clinicId: string,
  ): Promise<InsuranceClaimRecord | null> {
    return this.getReadClient().insuranceClaim.findFirst({
      where: { idempotencyKey: key, ...this.ownershipFilter(clinicId) },
      select: CLAIM_SELECT,
    });
  }

  async create(
    data: Prisma.InsuranceClaimUncheckedCreateInput,
  ): Promise<InsuranceClaimRecord> {
    return this.prisma.insuranceClaim.create({ data, select: CLAIM_SELECT });
  }

  async update(
    id: string,
    clinicId: string,
    expectedVersion: number,
    data: Prisma.InsuranceClaimUncheckedUpdateManyInput,
  ): Promise<InsuranceClaimRecord | null> {
    const result = await this.prisma.insuranceClaim.updateMany({
      where: {
        id,
        version: expectedVersion,
        ...this.ownershipFilter(clinicId),
      },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) return null;
    return this.findById(id, clinicId);
  }

  async transition(
    id: string,
    clinicId: string,
    expectedVersion: number,
    data: Prisma.InsuranceClaimUncheckedUpdateManyInput,
    event: Prisma.InsuranceClaimEventCreateWithoutClaimInput,
  ): Promise<InsuranceClaimRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.insuranceClaim.updateMany({
        where: {
          id,
          version: expectedVersion,
          ...this.ownershipFilter(clinicId),
        },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count === 0) return null;
      await tx.insuranceClaimEvent.create({
        data: { ...event, claim: { connect: { id } } },
      });
      return tx.insuranceClaim.findFirst({
        where: { id, ...this.ownershipFilter(clinicId) },
        select: CLAIM_SELECT,
      });
    });
  }

  async claimSubmission(
    id: string,
    clinicId: string,
    claimToken: string,
    now: Date,
    leaseExpiredBefore: Date,
  ): Promise<boolean> {
    const result = await this.prisma.insuranceClaim.updateMany({
      where: {
        id,
        ...this.ownershipFilter(clinicId),
        // LEGACY_UNVERIFIED claims predate delivery tracking. Re-sending them
        // would file claims with insurers that may already hold them.
        submissionStatus: {
          in: [
            ClaimSubmissionStatus.NOT_ATTEMPTED,
            ClaimSubmissionStatus.FAILED,
            ClaimSubmissionStatus.IN_FLIGHT,
          ],
        },
        // AND, not OR: the ownership filter above also contributes an OR, and a
        // second top-level OR would silently replace it and drop the tenant
        // predicate.
        AND: [
          {
            OR: [
              {
                submissionStatus: {
                  in: [
                    ClaimSubmissionStatus.NOT_ATTEMPTED,
                    ClaimSubmissionStatus.FAILED,
                  ],
                },
              },
              {
                // Only an expired lease may be taken over; a live claim is
                // another worker's send in progress.
                submissionStatus: ClaimSubmissionStatus.IN_FLIGHT,
                submissionClaimedAt: { lt: leaseExpiredBefore },
              },
            ],
          },
        ],
      },
      data: {
        submissionStatus: ClaimSubmissionStatus.IN_FLIGHT,
        submissionClaimToken: claimToken,
        submissionClaimedAt: now,
        submissionAttempts: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async settleSubmission(
    id: string,
    clinicId: string,
    claimToken: string,
    outcome: ClaimSubmissionOutcome,
  ): Promise<void> {
    const sent = outcome.status === ClaimSubmissionStatus.SENT;
    await this.prisma.insuranceClaim.updateMany({
      where: {
        id,
        ...this.ownershipFilter(clinicId),
        submissionClaimToken: claimToken,
        submissionStatus: ClaimSubmissionStatus.IN_FLIGHT,
      },
      data: {
        submissionStatus: outcome.status,
        // Cleared so the row never reads as in-flight forever.
        submissionClaimToken: null,
        submissionClaimedAt: null,
        submittedToInsurerAt: sent ? outcome.now : null,
        ...(outcome.externalReference
          ? { externalClaimReference: outcome.externalReference }
          : {}),
        submissionLastError: outcome.error ? outcome.error.slice(0, 500) : null,
      },
    });
  }

  async findPendingSubmissions(
    leaseExpiredBefore: Date,
    limit: number,
  ): Promise<PendingClaimSubmission[]> {
    const rows = await this.prisma.getReadClient().insuranceClaim.findMany({
      where: {
        // Only a claim actually marked submitted is owed a delivery.
        status: ClaimStatus.SUBMITTED,
        submissionStatus: {
          in: [
            ClaimSubmissionStatus.NOT_ATTEMPTED,
            ClaimSubmissionStatus.FAILED,
            ClaimSubmissionStatus.IN_FLIGHT,
          ],
        },
        OR: [
          {
            submissionStatus: {
              in: [
                ClaimSubmissionStatus.NOT_ATTEMPTED,
                ClaimSubmissionStatus.FAILED,
              ],
            },
          },
          {
            submissionStatus: ClaimSubmissionStatus.IN_FLIGHT,
            submissionClaimedAt: { lt: leaseExpiredBefore },
          },
        ],
      },
      select: {
        id: true,
        clinicId: true,
        submissionAttempts: true,
        // A claim with no direct clinic belongs to its patient's clinic, which
        // is the clinic the ownership filter would match it under.
        patient: { select: { clinicId: true } },
      },
      orderBy: { submittedAt: 'asc' },
      take: limit,
    });

    // A claim with neither its own clinic nor a patient's clinic cannot be
    // acted on safely, so it is left alone rather than filed blind.
    return rows
      .map((row) => ({
        id: row.id,
        clinicId: row.clinicId ?? row.patient?.clinicId ?? null,
        submissionAttempts: row.submissionAttempts,
      }))
      .filter((row): row is PendingClaimSubmission => row.clinicId !== null);
  }

  async attachDocument(
    claimId: string,
    clinicId: string,
    patientId: string,
    documentId: string,
  ): Promise<boolean> {
    const result = await this.prisma.document.updateMany({
      where: {
        id: documentId,
        patientId,
        insuranceClaimId: null,
        OR: [{ clinicId }, { patient: { clinicId } }],
      },
      data: { insuranceClaimId: claimId },
    });
    return result.count === 1;
  }

  findAttachableDocuments(patientId: string, clinicId: string) {
    return this.getReadClient().document.findMany({
      where: {
        patientId,
        insuranceClaimId: null,
        OR: [{ clinicId }, { patient: { clinicId } }],
      },
      select: CLAIM_DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async patientBelongsToClinic(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    const patient = await this.getReadClient().patient.findFirst({
      where: { id: patientId, clinicId },
      select: { id: true },
    });
    return patient !== null;
  }

  async referencesBelongToPatientClinic(params: {
    patientId: string;
    clinicId: string;
    appointmentId?: string | null;
    invoiceId?: string | null;
    parentClaimId?: string | null;
  }): Promise<boolean> {
    const { patientId, clinicId, appointmentId, invoiceId, parentClaimId } =
      params;
    const [appointment, invoice, parentClaim] = await Promise.all([
      appointmentId
        ? this.getReadClient().appointment.findFirst({
            where: { id: appointmentId, patientId, clinicId },
            select: { id: true },
          })
        : Promise.resolve({ id: '' }),
      invoiceId
        ? this.getReadClient().invoice.findFirst({
            where: {
              id: invoiceId,
              patientId,
              OR: [{ clinicId }, { clinicId: null, patient: { clinicId } }],
            },
            select: { id: true },
          })
        : Promise.resolve({ id: '' }),
      parentClaimId
        ? this.getReadClient().insuranceClaim.findFirst({
            where: {
              id: parentClaimId,
              patientId,
              ...this.ownershipFilter(clinicId),
            },
            select: { id: true },
          })
        : Promise.resolve({ id: '' }),
    ]);

    return appointment !== null && invoice !== null && parentClaim !== null;
  }
}
