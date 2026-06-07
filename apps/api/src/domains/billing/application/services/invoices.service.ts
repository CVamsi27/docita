import { Injectable, Inject } from '@nestjs/common';
import { InvoiceStatus } from '@workspace/db';
import { CreateInvoiceParams } from './invoices-helpers';
import {
  type InvoiceItem,
  type InvoicePaymentActivityResponse,
  type EnqueuePdfJobResponse,
} from '@workspace/types';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
  InvoiceDetail,
} from '@/domains/billing/core/repositories/invoice.repository';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  ClaimReadinessResult,
  ClaimValidationService,
} from '@/domains/billing/core/services/claim-validation.service';
import { TaxCalculatorService } from '@/domains/billing/core/services/tax-calculator.service';
import { PdfJobService } from '@/shared/modules/queue/pdf-job.service';
import type { PdfJobServicePort } from '@/shared/modules/queue/pdf-job.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BILLING_PERSISTENCE_PORT,
  type BillingPersistencePort,
} from '@/domains/billing/application/ports/billing-persistence.port';
import { PDFService } from './pdf.service';
import { InvoicesQueryService } from './invoices-query.service';
import { InvoicesCommandService } from './invoices-command.service';

/**
 * Facade — keeps the exact same constructor signature so all existing
 * consumers (controllers, processors, modules) continue to work unchanged.
 * Real logic lives in InvoicesQueryService / InvoicesCommandService.
 */
@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly repository: IInvoiceRepository,
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly paymentSessionRepository: IPaymentSessionRepository,
    @Inject(BILLING_PERSISTENCE_PORT)
    private readonly persistence: BillingPersistencePort,
    private readonly pdfService: PDFService,
    private readonly taxCalculator: TaxCalculatorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usageTracking: UsageTrackingService,
    private readonly storageProvider: StorageProvider,
    private readonly claimValidationService: ClaimValidationService,
    @Inject(StoredFileUrlResolverService)
    private readonly storedFileUrlResolver: Pick<
      StoredFileUrlResolverService,
      'resolveWithStoredUrl'
    >,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
    private readonly queryService: InvoicesQueryService,
    private readonly commandService: InvoicesCommandService,
  ) {}

// jscpd:ignore-start
  // ── READ ─────────────────────────────────────────────────────────────────────

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
    return this.queryService.findAll(clinicId, params);
// jscpd:ignore-end
  }

  async findOne(id: string, clinicId: string): Promise<InvoiceDetail> {
    return this.queryService.findOne(id, clinicId);
  }

  async listPaymentActivity(
    invoiceId: string,
    clinicId: string,
  ): Promise<InvoicePaymentActivityResponse> {
    return this.queryService.listPaymentActivity(invoiceId, clinicId);
  }

  async getClaimReadiness(
    id: string,
    clinicId: string,
  ): Promise<ClaimReadinessResult> {
    return this.queryService.getClaimReadiness(id, clinicId);
  }

  async generatePDF(id: string, clinicId: string): Promise<Buffer> {
    return this.queryService.generatePDF(id, clinicId);
  }

  async getPdf(
    id: string,
    clinicId: string,
  ): Promise<
    { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer }
  > {
    return this.queryService.getPdf(id, clinicId, (invoiceId, cId, buf, inv) =>
      this.commandService.uploadAndPersist(invoiceId, cId, buf, inv),
    );
  }

  async generatePdfAsync(
    id: string,
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse> {
    return this.queryService.generatePdfAsync(id, clinicId);
  }

  // ── WRITE ────────────────────────────────────────────────────────────────────

  async create(data: CreateInvoiceParams): Promise<InvoiceDetail> {
    return this.commandService.create(data);
  }

  async update(
    id: string,
    data: { status?: InvoiceStatus; total?: number; items?: InvoiceItem[] },
    clinicId: string,
  ): Promise<InvoiceDetail> {
    return this.commandService.update(id, data, clinicId);
  }

  async remove(id: string, clinicId: string): Promise<void> {
// jscpd:ignore-start
    return this.commandService.remove(id, clinicId);
  }

  async submitClaim(
    id: string,
    clinicId: string,
  ): Promise<{
    invoiceId: string;
    claimReady: true;
    submittedAt: string;
    status: InvoiceStatus;
  }> {
    return this.commandService.submitClaim(id, clinicId);
// jscpd:ignore-end
  }

  async uploadAndPersist(
    id: string,
    clinicId: string,
    buffer: Buffer,
    invoice: InvoiceDetail,
  ): Promise<{ storedKey: string; generatedAt: Date }> {
    return this.commandService.uploadAndPersist(id, clinicId, buffer, invoice);
  }
}
