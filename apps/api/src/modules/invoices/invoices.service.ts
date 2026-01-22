import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Invoice } from '@workspace/db';
import {
  INVOICE_CARD_SELECT,
  INVOICE_DETAIL_SELECT,
} from '../../common/select-fragments';
import { BaseService } from '../../common/services/base.service';
import { PDFGeneratorService } from '../../common/services/pdf-generator.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceGeneratedEvent } from './events/invoice-generated.event';
import type { InvoiceItem } from '@workspace/types';
import {
  validateSpecialization,
  validateHospitalRole,
} from './enum-validators';

/**
 * InvoicesService extends BaseService to leverage standardized CRUD patterns
 * while providing invoice-specific functionality like PDF generation and
 * WhatsApp notifications.
 *
 * Key patterns used:
 * - Template Method: BaseService provides findAll/findOne structure
 * - Strategy: WhatsAppNotificationService handles notification logic
 * - Factory: PDFGeneratorService creates PDF documents
 */
@Injectable()
export class InvoicesService extends BaseService<Invoice> {
  constructor(
    prisma: PrismaService,
    private readonly pdfGenerator: PDFGeneratorService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(prisma, 'invoice', 'Invoice');
  }

  // ============================================================================
  // BaseService Template Method Implementations
  // ============================================================================

  protected getListSelect() {
    return INVOICE_CARD_SELECT;
  }

  protected getDetailSelect() {
    return INVOICE_DETAIL_SELECT;
  }

  // @ts-expect-error - Method signature mismatch with base class unrelated to functional usage in this service context
  async findAll(
    clinicId: string,
    params?: {
      cursor?: string;
      limit?: number;
      patientId?: string;
      status?: string;
      date?: string;
      search?: string;
    },
  ) {
    const { cursor, limit, patientId, status, date, search } = params || {};

    if (!clinicId) {
      return { items: [], count: 0, nextCursor: undefined, hasMore: false };
    }

    const where: Prisma.InvoiceWhereInput =
      this.buildClinicWhereClause(clinicId);

    if (patientId) {
      where.patientId = patientId;
    }

    if (status && status !== 'all') {
      where.status = status;
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

    if (search) {
      where.OR = [
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Use Prisma directly to support complex filtering alongside pagination
    // Or call super.findAll if it supports extra where clauses?
    // Looking at common/services/base.service.ts would be ideal but for now we'll impl directly to be safe and explicit.

    const items = await this.prisma.invoice.findMany({
      where,
      take: limit ? limit + 1 : undefined,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: this.getListSelect(),
    });

    let nextCursor: string | undefined = undefined;
    if (limit && items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items,
      nextCursor,
      hasMore: !!nextCursor,
      count: items.length, // Approximate count of fetched page
    };
  }

  /**
   * Invoices don't have direct clinicId - they're linked via patient
   */
  protected buildClinicWhereClause(clinicId: string) {
    return { patient: { clinicId } };
  }

  // ============================================================================
  // Create Invoice with WhatsApp Notification
  // ============================================================================

  async create(data: {
    appointmentId?: string;
    patientId: string;
    total: number;
    status: string;
    items: InvoiceItem[];
    // Doctor context for audit trail (Phase 5)
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialization?: string | null;
    doctorRole?: string | null;
    doctorRegistrationNumber?: string;
    doctorLicenseNumber?: string;
    clinicId?: string;
  }) {
    const invoice = await this.prisma.invoice.create({
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        total: data.total,
        status: data.status,
        items: data.items as unknown as Prisma.InputJsonValue,
        // Save doctor context snapshot (Phase 5)
        doctorName: data.doctorName,
        doctorEmail: data.doctorEmail,
        doctorPhone: data.doctorPhone,
        doctorSpecialization: validateSpecialization(data.doctorSpecialization),
        doctorRole: validateHospitalRole(data.doctorRole),
        doctorRegistrationNumber: data.doctorRegistrationNumber,
        doctorLicenseNumber: data.doctorLicenseNumber,
      },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        total: true,
        status: true,
        items: true,
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
      },
    });

    // Emit event for side effects (notifications, payments, etc.)
    if (data.clinicId) {
      this.eventEmitter.emit(
        'invoice.generated',
        new InvoiceGeneratedEvent(invoice.id, data.clinicId),
      );
    }

    return invoice;
  }

  // ============================================================================
  // WhatsApp Notification (uses WhatsAppNotificationService)
  // ============================================================================

  // ============================================================================
  // Update Invoice
  // ============================================================================

  async update(
    id: string,
    data: { status?: string; total?: number; items?: InvoiceItem[] },
  ) {
    // Verify invoice exists first using BaseService
    await this.findOne(id);

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        items: data.items
          ? (data.items as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        total: true,
        status: true,
        items: true,
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
      },
    });
  }

  // ============================================================================
  // PDF Generation (uses PDFGeneratorService)
  // ============================================================================

  async generatePDF(id: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: INVOICE_DETAIL_SELECT,
    });

    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }

    const items = invoice.items as unknown as Array<InvoiceItem>;

    // Get clinic info from patient relation
    const clinic = invoice.patient.clinic;

    return this.pdfGenerator.generateInvoice({
      invoiceId: invoice.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic?.name || process.env.CLINIC_NAME || 'Docita Clinic',
        address: clinic?.address || process.env.CLINIC_ADDRESS,
        phone: clinic?.phone || process.env.CLINIC_PHONE,
        email: clinic?.email || process.env.CLINIC_EMAIL,
        gstin:
          (clinic as { gstin?: string })?.gstin || process.env.CLINIC_GSTIN,
      },
      patient: {
        name: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
        phoneNumber: invoice.patient.phoneNumber,
        email: invoice.patient.email || undefined,
        address: invoice.patient.address || undefined,
        patientId: invoice.patient.id.slice(0, 8).toUpperCase(),
      },
      doctor: invoice.appointment?.doctor
        ? {
            name: invoice.appointment.doctor.name,
            qualification:
              invoice.appointment.doctor.qualification || undefined,
            registrationNumber:
              invoice.appointment.doctor.registrationNumber || undefined,
          }
        : undefined,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.price,
        amount: item.quantity * item.price,
      })),
      subtotal: invoice.total,
      total: invoice.total,
      status: invoice.status.toUpperCase(),
      date: new Date(invoice.createdAt),
    });
  }
}
