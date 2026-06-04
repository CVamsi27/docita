import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IInsuranceClaimRepository,
  InsuranceClaimRecord,
  InsuranceClaimSearchParams,
  PaginatedResult,
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
      claimType,
      search,
      cursor,
      limit,
    } = params;

    if (!clinicId) {
      return { items: [], nextCursor: undefined, hasMore: false, count: 0 };
    }

    const filters: Prisma.InsuranceClaimWhereInput[] = [
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
    const items = rows.slice(0, safeLimit).map(toInsuranceClaimRecord);

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id : undefined,
      hasMore,
      count: items.length,
    };
  }

  async findById(
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
