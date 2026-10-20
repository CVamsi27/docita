import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrescriptionPdfOrchestratorService } from '@/domains/prescriptions/application/services/prescription-pdf-orchestrator.service';
import { InvoicesService } from '@/domains/billing/application/services/invoices.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { PublicDocumentTokenService } from './public-document-token.service';
import { PaymentSessionStatus } from '@workspace/db';
import { runWithTenant } from '@/shared/common/middleware/tenant.middleware';
import { RlsService } from '@/shared/modules/rls/rls.service';

interface PublicPdfResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

interface PublicDocumentAccessEvent {
  type: string;
  documentId: string;
  clinicId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class PublicPatientDocumentsService {
  private readonly logger = new Logger(PublicPatientDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: PublicDocumentTokenService,
    private readonly storageProvider: StorageProvider,
    private readonly prescriptionPdfOrchestrator: PrescriptionPdfOrchestratorService,
    private readonly invoicesService: InvoicesService,
    private readonly rls: RlsService,
  ) {}

  async getPrescriptionPdf(
    token: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<PublicPdfResult> {
    const verified = this.tokenService.verify(token);

    if (verified.type !== 'prescription')
      throw new NotFoundException('Prescription not found');

    return this.proxyPrescriptionPdf(verified.id, ipAddress, userAgent);
  }

  async getInvoicePdf(
    token: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<PublicPdfResult> {
    const verified = this.tokenService.verify(token);

    if (verified.type !== 'invoice')
      throw new NotFoundException('Invoice not found');

    return this.proxyInvoicePdf(verified.id, ipAddress, userAgent);
  }

  async resolvePaymentRedirectUrl(token: string): Promise<string> {
    // RLS-BYPASS: the opaque payment capability permits only its exact redirect metadata lookup.
    const session = await this.prisma.runUnrestricted(async () =>
      this.prisma.paymentSession.findUnique({
        where: { id: token },
        select: {
          shortUrl: true,
          paymentLink: true,
          status: true,
        },
      }),
    );

    if (!session) throw new NotFoundException('Payment link not found');

    if (
      session.status === PaymentSessionStatus.CAPTURED ||
      session.status === PaymentSessionStatus.PAID ||
      session.status === PaymentSessionStatus.EXPIRED ||
      session.status === PaymentSessionStatus.CANCELLED
    )
      throw new NotFoundException('Payment link is no longer available');

    const redirectUrl = session.shortUrl?.trim() || session.paymentLink?.trim();
    if (!redirectUrl) throw new NotFoundException('Payment link not found');

    return redirectUrl;
  }

  // Shared by the catch blocks of `proxyPrescriptionPdf` and
  // `proxyInvoicePdf` — both report the same "failed access" shape (clinic
  // unknown at failure time, error message normalized) and rethrow, so the
  // failure-logging step lives in one place rather than the two proxies
  // drifting apart.
  private logAccessFailureAndRethrow(
    type: PublicDocumentAccessEvent['type'],
    documentId: string,
    ipAddress: string,
    userAgent: string,
    error: unknown,
  ): never {
    this.logAccess({
      type,
      documentId,
      clinicId: '',
      ipAddress,
      userAgent,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }

  private async proxyPrescriptionPdf(
    prescriptionId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<PublicPdfResult> {
    try {
      // RLS-BYPASS: the verified signature permits only this exact PDF metadata and clinic bootstrap.
      const prescription = await this.prisma.runUnrestricted(async () =>
        this.prisma.prescription.findUnique({
          where: { id: prescriptionId },
          select: {
            pdfUrl: true,
            clinicId: true,
            appointment: { select: { clinicId: true } },
          },
        }),
      );
      if (!prescription) throw new NotFoundException('Prescription not found');

      const clinicId =
        prescription.clinicId ?? prescription.appointment?.clinicId;
      if (!clinicId) throw new NotFoundException('Prescription not found');

      return await runWithTenant({ clinicId }, () =>
        this.rls.runScopedTransaction(clinicId, async () => {
          const pdfUrl = prescription.pdfUrl;

          if (pdfUrl) {
            const { buffer, contentType } =
              await this.storageProvider.getObject(pdfUrl);
            this.logAccess({
              type: 'prescription',
              documentId: prescriptionId,
              clinicId,
              ipAddress,
              userAgent,
              success: true,
            });
            return {
              buffer,
              filename: `prescription-${prescriptionId}.pdf`,
              contentType,
            };
          }

          const buffer = await this.prescriptionPdfOrchestrator.generatePDF(
            prescriptionId,
            clinicId,
          );
          this.logAccess({
            type: 'prescription',
            documentId: prescriptionId,
            clinicId,
            ipAddress,
            userAgent,
            success: true,
          });
          return {
            buffer,
            filename: `prescription-${prescriptionId}.pdf`,
            contentType: 'application/pdf',
          };
        }),
      );
    } catch (error) {
      this.logAccessFailureAndRethrow(
        'prescription',
        prescriptionId,
        ipAddress,
        userAgent,
        error,
      );
    }
  }

  private async proxyInvoicePdf(
    invoiceId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<PublicPdfResult> {
    try {
      // RLS-BYPASS: the verified signature permits only this exact PDF metadata and clinic bootstrap.
      const invoice = await this.prisma.runUnrestricted(async () =>
        this.prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: {
            pdfUrl: true,
            clinicId: true,
            appointment: { select: { clinicId: true } },
          },
        }),
      );
      if (!invoice) throw new NotFoundException('Invoice not found');

      const clinicId = invoice.clinicId ?? invoice.appointment?.clinicId;
      if (!clinicId) throw new NotFoundException('Invoice not found');

      return await runWithTenant({ clinicId }, () =>
        this.rls.runScopedTransaction(clinicId, async () => {
          const pdfUrl = invoice.pdfUrl;

          if (pdfUrl) {
            const { buffer, contentType } =
              await this.storageProvider.getObject(pdfUrl);
            this.logAccess({
              type: 'invoice',
              documentId: invoiceId,
              clinicId,
              ipAddress,
              userAgent,
              success: true,
            });
            return {
              buffer,
              filename: `invoice-${invoiceId}.pdf`,
              contentType,
            };
          }

          const buffer = await this.invoicesService.generatePDF(
            invoiceId,
            clinicId,
          );
          const invoiceDetail = await this.invoicesService.findOne(
            invoiceId,
            clinicId,
          );
          await this.invoicesService.uploadAndPersist(
            invoiceId,
            clinicId,
            buffer,
            invoiceDetail,
          );
          this.logAccess({
            type: 'invoice',
            documentId: invoiceId,
            clinicId,
            ipAddress,
            userAgent,
            success: true,
          });
          return {
            buffer,
            filename: `invoice-${invoiceId}.pdf`,
            contentType: 'application/pdf',
          };
        }),
      );
    } catch (error) {
      this.logAccessFailureAndRethrow(
        'invoice',
        invoiceId,
        ipAddress,
        userAgent,
        error,
      );
    }
  }

  private logAccess(event: PublicDocumentAccessEvent): void {
    this.logger.log({
      event: 'PUBLIC_DOCUMENT_ACCESS',
      type: event.type,
      documentId: event.documentId,
      clinicId: event.clinicId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success,
      error: event.error,
      timestamp: new Date().toISOString(),
    });
  }
}
