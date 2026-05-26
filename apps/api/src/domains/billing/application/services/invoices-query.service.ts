import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Feature } from '@/shared/modules/auth/auth/tier.decorator';
import { assertClinicHasFeatureOrThrow } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { Prisma, InvoiceStatus, PaymentSession } from '@workspace/db';
import {
  type InvoicePaymentActivityItem,
  type InvoicePaymentActivityResponse,
  type EnqueuePdfJobResponse,
  extractPdfTheme,
  paymentSessionMetaJsonSchema,
} from '@workspace/types';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
  type InvoiceDetailRecord,
} from '@/domains/billing/core/repositories/invoice.repository';
import { toPrismaJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  ClaimReadinessResult,
  ClaimValidationService,
} from '@/domains/billing/core/services/claim-validation.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { PdfJobService } from '@/shared/modules/queue/pdf-job.service';
import type { PdfJobServicePort } from '@/shared/modules/queue/pdf-job.service';
import { PDFService } from './pdf.service';
import { resolveInvoiceItems } from '@/domains/billing/core/utils/invoice-item-resolution';
import {
  parseInvoiceItems,
  parseInvoiceTaxSummary,
  parseTaxRegistrationSnapshot,
  extractClinicGstin,
  PDF_SIGNED_URL_TTL_SECONDS,
} from './invoices-helpers';

@Injectable()
export class InvoicesQueryService {
  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly repository: IInvoiceRepository,
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly paymentSessionRepository: IPaymentSessionRepository,
    private readonly pdfService: PDFService,
    private readonly claimValidationService: ClaimValidationService,
    private readonly storageProvider: StorageProvider,
    @Inject(StoredFileUrlResolverService)
    private readonly storedFileUrlResolver: Pick<
      StoredFileUrlResolverService,
      'resolveWithStoredUrl'
    >,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
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
    const patientId = params?.patientId?.trim() || undefined;

    if (patientId) {
      const patient = await this.repository.findPatientContext(
        patientId,
        clinicId,
      );
      if (!patient) {
        throw new NotFoundException(`Patient ${patientId} not found`);
      }
    } else {
      const clinic = await this.repository.findClinicFeatureContext(clinicId);
      if (!clinic) {
        throw new NotFoundException(`Clinic ${clinicId} not found`);
      }
      assertClinicHasFeatureOrThrow(clinic, Feature.INVOICING);
    }

    return this.repository.findAll({
      clinicId,
      ...params,
      patientId,
    });
  }

  async findOne(id: string, clinicId: string): Promise<InvoiceDetail> {
    const invoice = await this.repository.findById(id, clinicId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return this.normalizeInvoiceDetail(invoice);
  }

  private normalizeInvoiceDetail(invoice: InvoiceDetailRecord): InvoiceDetail {
    const { lineItems, items, ...rest } = invoice;
    return {
      ...rest,
      items: toPrismaJsonValue(resolveInvoiceItems({ items, lineItems })),
    };
  }

  private extractPaymentActivityMeta(
    meta: Prisma.JsonValue | null | undefined,
  ): { channel?: string; reference?: string; notes?: string } {
    const m = parsePrismaJsonColumn(meta, paymentSessionMetaJsonSchema);
    if (!m) {
      return {};
    }
    const channelRaw =
      typeof m.channel === 'string'
        ? m.channel
        : typeof m.method === 'string'
          ? m.method
          : undefined;
    const referenceRaw =
      typeof m.reference === 'string' ? m.reference : undefined;
    let notes: string | undefined;
    if (typeof m.notes === 'string' && m.notes.trim()) {
      notes = m.notes.trim().slice(0, 500);
    }
    return {
      channel: channelRaw?.trim() || undefined,
      reference: referenceRaw?.trim() || undefined,
      notes,
    };
  }

  private toPaymentActivityItem(
    session: PaymentSession,
  ): InvoicePaymentActivityItem {
    const { channel, reference, notes } = this.extractPaymentActivityMeta(
      session.meta,
    );
    return {
      id: session.id,
      provider: session.provider,
      status: session.status,
      amountCents: session.amount,
      currency: session.currency,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      shortUrl: session.shortUrl ?? undefined,
      paymentLink: session.paymentLink ?? undefined,
      channel,
      reference,
      notes,
    };
  }

  async listPaymentActivity(
    invoiceId: string,
    clinicId: string,
  ): Promise<InvoicePaymentActivityResponse> {
    const invoice = await this.repository.findById(invoiceId, clinicId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    const sessions = await this.paymentSessionRepository.findByInvoiceId(
      invoiceId,
      clinicId,
    );
    return {
      items: sessions.map((s) => this.toPaymentActivityItem(s)),
    };
  }

  async getClaimReadiness(
    id: string,
    clinicId: string,
  ): Promise<ClaimReadinessResult> {
    return this.claimValidationService.evaluateClaimReadiness(id, clinicId);
  }

  async generatePDF(id: string, clinicId: string): Promise<Buffer> {
    const invoice = await this.findOne(id, clinicId);

    const items = parseInvoiceItems(invoice.items);
    const taxSummary = parseInvoiceTaxSummary(invoice.taxSummary);
    const sellerTaxSnapshot = parseTaxRegistrationSnapshot(
      invoice.sellerTaxSnapshot,
    );
    const buyerTaxSnapshot = parseTaxRegistrationSnapshot(
      invoice.buyerTaxSnapshot,
    );
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

    const procedureCptMap: Record<string, string> = {};
    if (invoice.appointment?.procedures) {
      for (const proc of invoice.appointment.procedures) {
        if (proc.cptCode?.code) {
          procedureCptMap[proc.description] = proc.cptCode.code;
        }
      }
    }

    const resolvedSignature =
      await this.storedFileUrlResolver.resolveWithStoredUrl(
        clinic.slaSignatureUrl ?? null,
      );

    return this.pdfService.generate({
      invoiceId: invoice.invoiceNumber ?? invoice.id.slice(0, 8).toUpperCase(),
      title:
        taxSummary?.documentTitle ??
        (invoice.invoiceType === 'TAX_INVOICE'
          ? 'Tax Invoice'
          : 'Bill of Supply'),
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phone || undefined,
        email: clinic.email || undefined,
        logo: clinic.logo || undefined,
        currency: clinic.currency || undefined,
        branding: extractPdfTheme(clinic.branding),
        gstin: sellerTaxSnapshot?.registrationId ?? extractClinicGstin(clinic),
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
      authorizedSignatureUrl: resolvedSignature.url ?? undefined,
      authorizedSignatureLabel: 'Authorized Signature',
      taxSummary,
      sellerTaxSnapshot,
      buyerTaxSnapshot,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? item.price,
        amount:
          item.lineTotal ??
          item.quantity * (item.unitPrice ?? item.price) -
            (item.discountAmount ?? 0) +
            (item.taxAmount ?? 0),
        cptCode: item.cptCode ?? procedureCptMap[item.description],
        hsnCode: item.hsnCode ?? item.sacCode,
        gstRate: item.taxRate,
      })),
      status: invoice.status.toUpperCase(),
      date: new Date(invoice.issuedAt ?? invoice.createdAt),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
    });
  }

  async getPdf(
    id: string,
    clinicId: string,
    uploadAndPersist: (
      id: string,
      clinicId: string,
      buffer: Buffer,
      invoice: InvoiceDetail,
    ) => Promise<{ storedKey: string; generatedAt: Date }>,
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
      const { storedKey } = await uploadAndPersist(
        id,
        clinicId,
        buffer,
        invoice,
      );

      const url = await this.storageProvider.generateSignedUrl(
        storedKey,
        PDF_SIGNED_URL_TTL_SECONDS,
      );
      return { type: 'url', url };
    }

    const buffer = await this.generatePDF(id, clinicId);
    return { type: 'buffer', buffer };
  }

  async generatePdfAsync(
    id: string,
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse> {
    return this.pdfJobService.enqueue(id, 'invoice', clinicId);
  }
}
