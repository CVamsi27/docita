import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Invoice } from '@workspace/db';
import {
  INVOICE_CARD_SELECT,
  INVOICE_DETAIL_SELECT,
} from '../common/select-fragments';
import { BaseService } from '../common/services/base.service';
import { WhatsAppNotificationService } from '../common/services/whatsapp-notification.service';
import { PDFGeneratorService } from '../common/services/pdf-generator.service';
import { PaymentsService } from '../modules/payments/payments.service';

/**
 * Invoice item structure
 */
interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

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
    private readonly whatsappNotificationService: WhatsAppNotificationService,
    private readonly pdfGenerator: PDFGeneratorService,
    private readonly paymentsService: PaymentsService,
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

  // @ts-ignore
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
    const where: any = this.buildClinicWhereClause(clinicId);

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
    doctorSpecialization?: any;
    doctorRole?: any;
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
        doctorSpecialization: data.doctorSpecialization || null,
        doctorRole: data.doctorRole || null,
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

    // Send WhatsApp notification if automation is enabled
    await this.sendInvoiceNotification(invoice, data.clinicId);

    return invoice;
  }

  // ============================================================================
  // WhatsApp Notification (uses WhatsAppNotificationService)
  // ============================================================================

  private async sendInvoiceNotification(
    invoice: {
      id: string;
      patientId: string;
      patient: { firstName: string; lastName: string; phoneNumber: string };
      total: number;
      items: any;
      createdAt: Date;
    },
    clinicId?: string,
  ) {
    if (!clinicId || !invoice.patient.phoneNumber) return;

    // Create payment link via Razorpay before sending WhatsApp
    let paymentLink: string | undefined;
    try {
      const paymentSession = await this.paymentsService.createPaymentSession({
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: 'INR',
        patientId: invoice.patientId,
        clinicId,
        description: `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
      });
      paymentLink =
        paymentSession.shortUrl || paymentSession.paymentLink || undefined;
      this.logger.log(
        `Created payment link for invoice ${invoice.id}: ${paymentLink}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create payment link for invoice ${invoice.id}`,
        error,
      );
    }

    // Format date and amount for template
    const date = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const amount = `₹${invoice.total.toFixed(2)}`;

    // Get clinic info for the fallback message
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const message = this.buildFallbackMessage(
      invoice,
      clinic?.name || 'Our Clinic',
      paymentLink,
    );

    await this.whatsappNotificationService.sendNotification({
      type: 'invoice',
      clinicId,
      phoneNumber: invoice.patient.phoneNumber,
      message,
      entityId: invoice.id,
    });
  }

  private buildFallbackMessage(
    invoice: {
      id: string;
      patient: { firstName: string; lastName: string };
      total: number;
      createdAt: Date;
    },
    clinicName: string,
    paymentLink?: string,
  ): string {
    const patientName = invoice.patient.firstName;
    const date = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let message = `Hello ${patientName}👋\n\n`;
    message += `Your invoice from *${clinicName}* is ready!\n\n`;
    message += `📄 Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}\n`;
    message += `📅 Date: ${date}\n`;
    message += `💰 Amount Due: ₹${invoice.total.toFixed(2)}\n\n`;
    if (paymentLink) {
      message += `💳 Pay online: ${paymentLink}\n\n`;
    }
    message += `Thank you for choosing our clinic. Get well soon! 🏥`;

    return message;
  }

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
        gstin: (clinic as any)?.gstin,
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
