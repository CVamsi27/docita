import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IInvoiceRepository,
  InvoiceDetail,
  InvoiceListItem,
  InvoiceSearchParams,
  PaginatedResult,
} from '@/domains/billing/core/repositories/invoice.repository';
import { Prisma, InvoiceStatus } from '@workspace/db';
import { paginateWithCursor } from '@/common/pagination.helper';
import {
  INVOICE_CARD_SELECT,
  INVOICE_DETAIL_SELECT,
} from '@/common/select-fragments';

type CursorModel<T> = {
  findMany: (args?: Record<string, unknown>) => Promise<T[]>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
};

@Injectable()
export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    params: InvoiceSearchParams,
  ): Promise<PaginatedResult<InvoiceListItem>> {
    const { clinicId, patientId, status, date, search, cursor, limit } = params;

    if (!clinicId) {
      return { items: [], nextCursor: undefined, hasMore: false, count: 0 };
    }

    const where: Prisma.InvoiceWhereInput = {
      patient: { clinicId },
    };

    if (patientId) {
      where.patientId = patientId;
    }

    if (status && status !== 'all') {
      where.status = status as InvoiceStatus;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const patientFilter = (where.patient as Prisma.PatientWhereInput) || {
      clinicId,
    };

    if (search) {
      where.patient = {
        ...patientFilter,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const model: CursorModel<InvoiceListItem> = {
      findMany: (args?: Record<string, unknown>) =>
        this.prisma.invoice.findMany({
          ...(args as Prisma.InvoiceFindManyArgs),
          select: INVOICE_CARD_SELECT,
        }),
      count: (args?: { where?: Record<string, unknown> }) =>
        this.prisma.invoice.count(args as Prisma.InvoiceCountArgs),
    };

    return paginateWithCursor({
      model,
      cursor,
      limit: limit || 20,
      where,
      orderBy: { createdAt: 'desc' },
      select: undefined,
    });
  }

  async findById(id: string): Promise<InvoiceDetail | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice as InvoiceDetail | null;
  }

  async create(data: Prisma.InvoiceCreateInput): Promise<InvoiceDetail> {
    const invoice = await this.prisma.invoice.create({
      data,
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice as InvoiceDetail;
  }

  async update(
    id: string,
    data: Prisma.InvoiceUpdateInput,
  ): Promise<InvoiceDetail> {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data,
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice as InvoiceDetail;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.invoice.delete({ where: { id } });
  }
}
