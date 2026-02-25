import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Prisma, InvoiceStatus } from '@workspace/db';
import { PDFService } from './pdf.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { InvoiceItem } from '@workspace/types';
import { AppConfigService } from '../../../../shared/modules/config/app-configuration.service';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
} from '../../core/repositories/invoice.repository';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly repository: IInvoiceRepository,
    private readonly pdfService: PDFService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: AppConfigService,
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

  async findOne(id: string, clinicId?: string): Promise<InvoiceDetail> {
    const invoice = await this.repository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (clinicId) {
      if (invoice.patient && invoice.patient.clinicId !== clinicId) {
        throw new NotFoundException(`Invoice ${id} not found`);
      }
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
  }): Promise<InvoiceDetail> {
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
      doctorSpecialization: data.doctorSpecialization as any,
      doctorRole: data.doctorRole as any,
      doctorRegistrationNumber: data.doctorRegistrationNumber,
      doctorLicenseNumber: data.doctorLicenseNumber,
    });

    if (data.clinicId) {
      this.eventEmitter.emit('invoice.generated', {
        invoiceId: invoice.id,
        clinicId: data.clinicId,
      });
    }

    return invoice;
  }

  async update(
    id: string,
    data: { status?: InvoiceStatus; total?: number; items?: InvoiceItem[] },
    clinicId?: string,
  ): Promise<InvoiceDetail> {
    await this.findOne(id, clinicId);

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

  async generatePDF(id: string, clinicId?: string): Promise<Buffer> {
    const invoice = await this.findOne(id, clinicId);

    const items = (invoice.items as unknown as InvoiceItem[]) || [];
    const patient = invoice.patient;
    const clinic = patient?.clinic;
    const defaultClinic = this.configService.getClinicInfo();

    return this.pdfService.generate({
      invoiceId: invoice.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic?.name || defaultClinic.name,
        address: clinic?.address || defaultClinic.address,
        phone: clinic?.phone || defaultClinic.phone,
        email: clinic?.email || defaultClinic.email,
        gstin: clinic?.gstin || defaultClinic.gstin,
      },
      patient: {
        name: `${patient?.firstName} ${patient?.lastName}`,
        phoneNumber: patient?.phoneNumber || '',
        email: patient?.email || undefined,
        address: patient?.address || undefined,
        patientId: patient?.id.slice(0, 8).toUpperCase() || '',
      },
      doctor: invoice.appointment?.doctor
        ? {
            name: invoice.appointment.doctor.name,
            qualification:
              invoice.appointment.doctor.qualification || undefined,
            registrationNumber:
              invoice.appointment.doctor.registrationNumber || undefined,
          }
        : {
            name: invoice.doctorName || 'Doctor',
            qualification: invoice.doctorSpecialization || undefined,
            registrationNumber: invoice.doctorRegistrationNumber || undefined,
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
