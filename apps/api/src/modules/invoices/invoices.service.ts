import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Prisma, Invoice, InvoiceStatus } from '@workspace/db';
import {
  INVOICE_CARD_SELECT,
  INVOICE_DETAIL_SELECT,
} from '../../common/select-fragments';
import { InvoicePdfService } from './invoice-pdf.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceGeneratedEvent } from './events/invoice-generated.event';
import type { InvoiceItem } from '@workspace/types';

import {
  validateSpecialization,
  validateHospitalRole,
} from './enum-validators';
import { IInvoiceRepository } from './repositories/invoice.repository.interface';

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
export class InvoicesService {
  constructor(
    @Inject('IInvoiceRepository')
    private readonly repository: IInvoiceRepository,
    private readonly pdfService: InvoicePdfService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    clinicId: string,
    params?: {
      cursor?: string;
      limit?: number;
      patientId?: string;
      status?: InvoiceStatus;
      date?: string;
      search?: string;
    },
  ) {
    return this.repository.findAll({
      clinicId,
      ...params,
    });
  }

  async findOne(id: string) {
    const invoice = await this.repository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async create(data: {
    appointmentId?: string;
    patientId: string;
    total: number;
    status: InvoiceStatus;
    items: InvoiceItem[];
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialization?: string | null;
    doctorRole?: string | null;
    doctorRegistrationNumber?: string;
    doctorLicenseNumber?: string;
    clinicId?: string;
  }) {
    const invoice = await this.repository.create({
      appointment: data.appointmentId
        ? { connect: { id: data.appointmentId } }
        : undefined,
      patient: { connect: { id: data.patientId } },
      total: data.total,
      status: data.status,
      items: data.items as unknown as Prisma.InputJsonValue,
      doctorName: data.doctorName,
      doctorEmail: data.doctorEmail,
      doctorPhone: data.doctorPhone,
      doctorSpecialization: validateSpecialization(data.doctorSpecialization),
      doctorRole: validateHospitalRole(data.doctorRole),
      doctorRegistrationNumber: data.doctorRegistrationNumber,
      doctorLicenseNumber: data.doctorLicenseNumber,
    });

    if (data.clinicId) {
      this.eventEmitter.emit(
        'invoice.generated',
        new InvoiceGeneratedEvent(invoice.id, data.clinicId),
      );
    }

    return invoice;
  }

  async update(
    id: string,
    data: { status?: InvoiceStatus; total?: number; items?: InvoiceItem[] },
  ) {
    await this.findOne(id); // Ensure exists

    return this.repository.update(id, {
      ...data,
      items: data.items
        ? (data.items as unknown as Prisma.InputJsonValue)
        : undefined,
    });
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async generatePDF(id: string): Promise<Buffer> {
    const invoice = await this.findOne(id);

    const items = invoice.items as unknown as Array<InvoiceItem>;
    // invoice returned by findOne -> repository.findById uses INVOICE_DETAIL_SELECT.
    // INVOICE_DETAIL_SELECT includes patient, patient.clinic, appointment.doctor.
    // Check types. generic Invoice type from @workspace/db might not have these relations optional in strict sense,
    // but repository return type is Invoice. We cast it in repo.

    // We need to ensure the data is there. The select fragment ensures it.
    // Types might need casting if Invoice type doesn't have relations by default.
    // Usually prisma client types include relations as optional.

    const invoiceWithRelations = invoice as any; // Cast for accessing relations safely if strict typing complains

    const clinic = invoiceWithRelations.patient?.clinic;

    return this.pdfService.generate({
      invoiceId: invoice.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic?.name || process.env.CLINIC_NAME || 'Docita Clinic',
        address: clinic?.address || process.env.CLINIC_ADDRESS,
        phone: clinic?.phone || process.env.CLINIC_PHONE,
        email: clinic?.email || process.env.CLINIC_EMAIL,
        gstin: clinic?.gstin || process.env.CLINIC_GSTIN,
      },
      patient: {
        name: `${invoiceWithRelations.patient.firstName} ${invoiceWithRelations.patient.lastName}`,
        phoneNumber: invoiceWithRelations.patient.phoneNumber,
        email: invoiceWithRelations.patient.email || undefined,
        address: invoiceWithRelations.patient.address || undefined,
        patientId: invoiceWithRelations.patient.id.slice(0, 8).toUpperCase(),
      },
      doctor: invoiceWithRelations.appointment?.doctor
        ? {
            name: invoiceWithRelations.appointment.doctor.name,
            qualification:
              invoiceWithRelations.appointment.doctor.qualification ||
              undefined,
            registrationNumber:
              invoiceWithRelations.appointment.doctor.registrationNumber ||
              undefined,
          }
        : {
            name: invoiceWithRelations.doctorName || 'Doctor',
            qualification:
              invoiceWithRelations.doctorSpecialization || undefined,
            registrationNumber:
              invoiceWithRelations.doctorRegistrationNumber || undefined,
          },
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.price,
        amount: item.quantity * item.price,
      })),
      status: invoice.status.toUpperCase(),
      date: new Date(invoice.createdAt),
    });
  }
}
