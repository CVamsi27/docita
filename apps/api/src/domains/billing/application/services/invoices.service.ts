import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  InvoiceStatus,
  HospitalRole,
  Specialization,
} from '@workspace/db';
import { PDFService } from './pdf.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { invoiceItemSchema, type InvoiceItem } from '@workspace/types';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
} from '@/domains/billing/core/repositories/invoice.repository';

const toPrismaInvoiceItems = (items: InvoiceItem[]): Prisma.InputJsonValue => {
  const parsedItems = invoiceItemSchema.array().parse(items);
  return parsedItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    price: item.price,
  })) as Prisma.InputJsonValue;
};

const parseInvoiceItems = (items: unknown): InvoiceItem[] => {
  const parsed = invoiceItemSchema.array().safeParse(items);
  return parsed.success ? parsed.data : [];
};

const normalizeSpecialization = (
  value?: string | null,
): Specialization | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Object.values(Specialization).includes(value as Specialization)
    ? (value as Specialization)
    : undefined;
};

const normalizeDoctorRole = (
  value?: string | null,
): HospitalRole | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Object.values(HospitalRole).includes(value as HospitalRole)
    ? (value as HospitalRole)
    : undefined;
};

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly repository: IInvoiceRepository,
    private readonly pdfService: PDFService,
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

  async findOne(id: string, clinicId?: string): Promise<InvoiceDetail> {
    const invoice = await this.repository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (clinicId) {
      const patientClinicId = invoice.patient?.clinic?.id;
      if (patientClinicId && patientClinicId !== clinicId) {
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
      items: toPrismaInvoiceItems(data.items),
      doctorName: data.doctorName,
      doctorEmail: data.doctorEmail,
      doctorPhone: data.doctorPhone,
      doctorSpecialization: normalizeSpecialization(data.doctorSpecialization),
      doctorRole: normalizeDoctorRole(data.doctorRole),
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
      items: data.items ? toPrismaInvoiceItems(data.items) : undefined,
    });
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async generatePDF(id: string, clinicId?: string): Promise<Buffer> {
    const invoice = await this.findOne(id, clinicId);

    const items = parseInvoiceItems(invoice.items);
    const patient = invoice.patient;
    const clinic = patient?.clinic;
    if (!clinic?.name) {
      throw new BadRequestException(
        'Clinic details are required to generate invoice PDF',
      );
    }
    const doctorName = invoice.appointment?.doctor?.name || invoice.doctorName;
    if (!doctorName) {
      throw new BadRequestException(
        'Doctor details are required to generate invoice PDF',
      );
    }

    return this.pdfService.generate({
      invoiceId: invoice.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phone || undefined,
        email: clinic.email || undefined,
        gstin: clinic.gstin || undefined,
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
            name: doctorName,
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
