import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IInvoiceRepository,
  InvoiceDetail as InvoiceDetailRecord,
  InvoiceListItem,
  PatientInvoiceContext,
  InvoiceSearchParams,
  PaginatedResult,
} from '@/domains/billing/core/repositories/invoice.repository';
import { Prisma } from '@workspace/db';
import {
  INVOICE_CARD_SELECT,
  INVOICE_DETAIL_SELECT,
} from '@/shared/common/select-fragments';
import { parseInvoiceListStatus } from '@/domains/billing/infrastructure/repositories/invoice-list-status';

type InvoiceListItemRow = Prisma.InvoiceGetPayload<{
  select: typeof INVOICE_CARD_SELECT;
}>;

function toInvoiceListItem(row: InvoiceListItemRow): InvoiceListItem {
  return row;
}

const PATIENT_INVOICE_CONTEXT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  email: true,
  address: true,
  clinicId: true,
  clinic: {
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      currency: true,
      settings: true,
    },
  },
} as const;

type PatientInvoiceContextRow = Prisma.PatientGetPayload<{
  select: typeof PATIENT_INVOICE_CONTEXT_SELECT;
}>;

const getIndianFinancialYear = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
};

const normalizeInvoicePrefix = (prefix?: string): string => {
  const normalized = prefix?.replace(/[^a-z0-9]/gi, '').toUpperCase() || 'DC';
  return normalized.slice(0, 4);
};

@Injectable()
export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findAll(
    params: InvoiceSearchParams,
  ): Promise<PaginatedResult<InvoiceListItem>> {
    const { clinicId, patientId, status, date, search, cursor, limit } = params;

    if (!clinicId) {
      return { items: [], nextCursor: undefined, hasMore: false, count: 0 };
    }

    const ownershipFilter: Prisma.InvoiceWhereInput = {
      OR: [{ clinicId }, { clinicId: null, patient: { clinicId } }],
    };
    const filters: Prisma.InvoiceWhereInput[] = [ownershipFilter];

    if (patientId) {
      filters.push({ patientId });
    }

    const parsedStatus = parseInvoiceListStatus(status);
    if (parsedStatus) {
      filters.push({ status: parsedStatus });
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      filters.push({
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      });
    }

    if (search) {
      filters.push({
        patient: {
          clinicId,
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        },
      });
    }

    const where: Prisma.InvoiceWhereInput = { AND: filters };

    const readClient = this.getReadClient();
    const safeLimit = Math.min(limit || 20, 100);
    const query = {
      take: safeLimit + 1,
      where,
      orderBy: { createdAt: 'desc' },
      select: INVOICE_CARD_SELECT,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    } satisfies Prisma.InvoiceFindManyArgs;

    const rows = await readClient.invoice.findMany(query);
    const hasMore = rows.length > safeLimit;
    const items = rows.slice(0, safeLimit).map(toInvoiceListItem);

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id : undefined,
      hasMore,
      count: items.length,
    };
  }

  private invoiceOwnershipFilter(clinicId: string): Prisma.InvoiceWhereInput {
    return {
      OR: [{ clinicId }, { clinicId: null, patient: { clinicId } }],
    };
  }

  async findById(
    id: string,
    clinicId: string,
  ): Promise<InvoiceDetailRecord | null> {
    const invoice = await this.getReadClient().invoice.findFirst({
      where: { id, ...this.invoiceOwnershipFilter(clinicId) },
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice;
  }

  async findByIdUnscoped(id: string): Promise<InvoiceDetailRecord | null> {
    const invoice = await this.getReadClient().invoice.findFirst({
      where: { id },
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice;
  }

  async findByIdempotencyKey(
    key: string,
    clinicId?: string,
  ): Promise<InvoiceDetailRecord | null> {
    return this.getReadClient().invoice.findFirst({
      where: {
        idempotencyKey: key,
        ...(clinicId ? this.invoiceOwnershipFilter(clinicId) : {}),
      },
      select: INVOICE_DETAIL_SELECT,
    });
  }

  async create(
    data: Prisma.InvoiceCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceDetailRecord> {
    const client = tx ?? this.prisma;
    const invoice = await client.invoice.create({
      data,
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice;
  }

  async update(
    id: string,
    data: Prisma.InvoiceUpdateInput,
    clinicId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceDetailRecord> {
    const client = tx ?? this.prisma;
    const result = await client.invoice.updateMany({
      where: { id, ...this.invoiceOwnershipFilter(clinicId) },
      data,
    });
    if (result.count === 0) {
      throw new Error(`Invoice ${id} not found`);
    }

    const invoice = await client.invoice.findFirst({
      where: { id, ...this.invoiceOwnershipFilter(clinicId) },
      select: INVOICE_DETAIL_SELECT,
    });
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.invoice.deleteMany({
      where: { id, ...this.invoiceOwnershipFilter(clinicId) },
    });
  }

  async findPatientContext(
    patientId: string,
    clinicId?: string,
  ): Promise<PatientInvoiceContext | null> {
    const patient: PatientInvoiceContextRow | null =
      await this.getReadClient().patient.findFirst({
        where: {
          id: patientId,
          ...(clinicId ? { clinicId } : {}),
        },
        select: PATIENT_INVOICE_CONTEXT_SELECT,
      });

    return patient;
  }

  async findClinicFeatureContext(clinicId: string) {
    return this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true,
      },
    });
  }

  async nextInvoiceNumber(
    clinicId: string,
    issuedAt: Date,
    prefix?: string,
  ): Promise<string> {
    const financialYear = getIndianFinancialYear(issuedAt);
    const normalizedPrefix = normalizeInvoicePrefix(prefix);
    const sequence = await this.prisma.invoiceSequence.upsert({
      where: {
        clinicId_financialYear: {
          clinicId,
          financialYear,
        },
      },
      update: {
        currentValue: { increment: 1 },
        prefix: normalizedPrefix,
      },
      create: {
        clinic: { connect: { id: clinicId } },
        financialYear,
        prefix: normalizedPrefix,
        currentValue: 1,
      },
    });

    return `${normalizedPrefix}${financialYear}-${String(
      sequence.currentValue,
    ).padStart(6, '0')}`.slice(0, 16);
  }
}
