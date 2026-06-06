// check-non-null-assertion: allow-file — non-null guaranteed by prior guard or Prisma include
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
  paymentSessionMetaJsonSchema,
} from '@workspace/types';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
} from '@/domains/billing/core/repositories/invoice.repository';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  ClaimReadinessResult,
  ClaimValidationService,
} from '@/domains/billing/core/services/claim-validation.service';
import {
  GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
  StorageProvider,
} from '@/domains/documents/application/ports/storage-provider.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { PdfJobService } from '@/shared/modules/queue/pdf-job.service';
import type { PdfJobServicePort } from '@/shared/modules/queue/pdf-job.service';
import { PDFService } from './pdf.service';
import {
  parseInvoiceItems,
  parseInvoiceTaxSummary,
  parseTaxRegistrationSnapshot,
} from './invoices-helpers';
import {
  buildProcedureCptMap,
  buildPdfInvoiceId,
  buildPdfTitle,
  buildPdfClinicInfo,
  buildPdfPatientInfo,
  buildPdfDoctorInfo,
  buildPdfItems,
} from './invoice-pdf-helpers';

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
      statuses?: InvoiceStatus[];
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
    return invoice;
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
    const clinic = invoice.patient?.clinic;
    if (!clinic?.name)
      throw new BadRequestException(
        'Clinic details are required to generate invoice PDF',
      );
    if (!(invoice.appointment?.doctor?.name || invoice.doctorName)) {
      throw new BadRequestException(
        'Doctor details are required to generate invoice PDF',
      );
    }

    const procedureCptMap = buildProcedureCptMap(
      invoice.appointment?.procedures,
    );
    const resolvedSignature = await this.storedFileUrlResolver.resolveWithStoredUrl(
        clinic.slaSignatureUrl ?? null,
      );

    return this.pdfService.generate({
      invoiceId: buildPdfInvoiceId(invoice),
      title: buildPdfTitle(invoice, taxSummary),
      clinic: buildPdfClinicInfo(clinic, sellerTaxSnapshot),
      patient: buildPdfPatientInfo(invoice.patient!),
      doctor: buildPdfDoctorInfo(invoice),
      authorizedSignatureUrl: resolvedSignature.url ?? undefined,
      authorizedSignatureLabel: 'Authorized Signature',
      taxSummary,
      sellerTaxSnapshot,
      buyerTaxSnapshot,
      items: buildPdfItems(items, procedureCptMap),
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
          GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
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
        GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
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
