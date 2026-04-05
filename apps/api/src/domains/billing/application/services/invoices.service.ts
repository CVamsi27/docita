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
import {
  invoiceItemSchema,
  type InvoiceItem,
  extractPdfTheme,
} from '@workspace/types';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
} from '@/domains/billing/core/repositories/invoice.repository';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import {
  ClaimReadinessResult,
  ClaimValidationService,
} from '@/domains/billing/core/services/claim-validation.service';

const CURRENT_PDF_TEMPLATE_VERSION = 1;
const PDF_SIGNED_URL_TTL_SECONDS = 3600;

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

const extractClinicGstin = (
  clinic:
    | {
        gstin?: string | null;
        settings?: Prisma.JsonValue | null;
      }
    | null
    | undefined,
): string | undefined => {
  if (!clinic) return undefined;
  if (clinic.gstin) return clinic.gstin;

  const settings = clinic.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return undefined;
  }

  const gstin = (settings as Record<string, unknown>).gstin;
  return typeof gstin === 'string' && gstin.trim() ? gstin.trim() : undefined;
};

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly repository: IInvoiceRepository,
    private readonly pdfService: PDFService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usageTracking: UsageTrackingService,
    private readonly storageProvider: StorageProvider,
    private readonly claimValidationService: ClaimValidationService,
  ) {}

  private requiresClaimReadinessValidation(
    currentStatus: InvoiceStatus,
    targetStatus: InvoiceStatus,
  ): boolean {
    if (currentStatus === targetStatus) return false;
    return (
      targetStatus === InvoiceStatus.PAID ||
      targetStatus === InvoiceStatus.PARTIALLY_PAID ||
      targetStatus === InvoiceStatus.OVERDUE
    );
  }

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
      this.usageTracking
        .trackInvoice(data.clinicId, invoice.id)
        .catch(() => {});
    }

    return invoice;
  }

  async update(
    id: string,
    data: { status?: InvoiceStatus; total?: number; items?: InvoiceItem[] },
    clinicId?: string,
  ): Promise<InvoiceDetail> {
    const existing = await this.findOne(id, clinicId);

    if (
      data.status &&
      this.requiresClaimReadinessValidation(existing.status, data.status)
    ) {
      await this.claimValidationService.assertClaimReady(id, clinicId);
    }

    return this.repository.update(id, {
      ...data,
      items: data.items ? toPrismaInvoiceItems(data.items) : undefined,
    });
  }

  async getClaimReadiness(
    id: string,
    clinicId?: string,
  ): Promise<ClaimReadinessResult> {
    return this.claimValidationService.evaluateClaimReadiness(id, clinicId);
  }

  async submitClaim(
    id: string,
    clinicId?: string,
  ): Promise<{
    invoiceId: string;
    claimReady: true;
    submittedAt: string;
    status: InvoiceStatus;
  }> {
    await this.claimValidationService.assertClaimReady(id, clinicId);
    const invoice = await this.findOne(id, clinicId);

    return {
      invoiceId: invoice.id,
      claimReady: true,
      submittedAt: new Date().toISOString(),
      status: invoice.status,
    };
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

    // Build a description → CPT code map from appointment procedures
    const procedureCptMap: Record<string, string> = {};
    if (invoice.appointment?.procedures) {
      for (const proc of invoice.appointment.procedures) {
        if (proc.cptCode?.code) {
          procedureCptMap[proc.description] = proc.cptCode.code;
        }
      }
    }

    return this.pdfService.generate({
      invoiceId: invoice.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phone || undefined,
        email: clinic.email || undefined,
        logo: clinic.logo || undefined,
        currency: clinic.currency || undefined,
        branding: extractPdfTheme(clinic.branding),
        gstin: extractClinicGstin(clinic),
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
      authorizedSignatureUrl: clinic.slaSignatureUrl || undefined,
      authorizedSignatureLabel: 'Authorized Signature',
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.price,
        amount: item.quantity * item.price,
        cptCode: item.cptCode ?? procedureCptMap[item.description],
        hsnCode: item.hsnCode,
      })),
      status: invoice.status.toUpperCase(),
      date: new Date(invoice.createdAt),
    });
  }

  async getPdf(
    id: string,
    clinicId?: string,
  ): Promise<
    { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer }
  > {
    if (this.storageProvider.supportsSignedUrls) {
      const invoice = await this.findOne(id, clinicId);

      if (invoice.pdfUrl) {
        const url = await this.storageProvider.generateSignedUrl(
          invoice.pdfUrl,
          PDF_SIGNED_URL_TTL_SECONDS,
        );
        return { type: 'url', url };
      }

      const buffer = await this.generatePDF(id, clinicId);
      const objectKey = `pdfs/invoices/${id}.pdf`;
      const generatedAt = new Date();
      const storedKey = await this.storageProvider.uploadBuffer(
        buffer,
        objectKey,
        'application/pdf',
        {
          metadata: {
            asset_type: 'invoice-pdf',
            resource_type: 'Invoice',
            resource_id: id,
            clinic_id: invoice.patient?.clinic?.id,
            doctor_id: invoice.appointment?.doctor?.id,
            modified_at: generatedAt.toISOString(),
            modified_by: invoice.appointment?.doctor?.id || 'system',
            auth_method: 'invoice-service',
          },
        },
      );

      await this.repository.update(id, {
        pdfUrl: storedKey,
        pdfGeneratedAt: generatedAt,
        pdfTemplateVersion: CURRENT_PDF_TEMPLATE_VERSION,
      });

      const url = await this.storageProvider.generateSignedUrl(
        storedKey,
        PDF_SIGNED_URL_TTL_SECONDS,
      );
      return { type: 'url', url };
    }

    const buffer = await this.generatePDF(id, clinicId);
    return { type: 'buffer', buffer };
  }
}
