import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IInvoiceRepository,
  InvoiceSearchParams,
  PaginatedResult,
} from './invoice.repository.interface';
import { Invoice, Prisma, InvoiceStatus } from '@workspace/db';
import { paginateWithCursor } from '../../../common/pagination.helper';
import {
  INVOICE_CARD_SELECT,
  INVOICE_DETAIL_SELECT,
} from '../../../common/select-fragments';

@Injectable()
export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    params: InvoiceSearchParams,
  ): Promise<PaginatedResult<Invoice>> {
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

    // Ensure patient filter exists and is an object
    const patientFilter = (where.patient as Prisma.PatientWhereInput) || {
      clinicId,
    };

    // Search Logic
    if (search) {
      where.patient = {
        ...patientFilter,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    return paginateWithCursor({
      model: this.prisma.invoice as any,
      cursor,
      limit: limit || 20,
      where,
      orderBy: { createdAt: 'desc' },
      select: INVOICE_CARD_SELECT,
    }) as Promise<PaginatedResult<Invoice>>;
  }

  async findById(id: string): Promise<Invoice | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice as unknown as Invoice;
  }

  async create(data: Prisma.InvoiceCreateInput): Promise<Invoice> {
    const invoice = await this.prisma.invoice.create({
      data,
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice as unknown as Invoice;
  }

  async update(id: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice> {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data,
      select: INVOICE_DETAIL_SELECT,
    });
    return invoice as unknown as Invoice;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.invoice.delete({ where: { id } });
  }
}
