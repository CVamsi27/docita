import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrescriptionPdfOrchestratorService } from '@/domains/prescriptions/application/services/prescription-pdf-orchestrator.service';
import { InvoicesQueryService } from '@/domains/billing/application/services/invoices-query.service';
import { InvoicesCommandService } from '@/domains/billing/application/services/invoices-command.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { PublicDocumentTokenService } from './public-document-token.service';
import { PaymentSessionStatus } from '@workspace/db';

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
    private readonly invoicesQueryService: InvoicesQueryService,
    private readonly invoicesCommandService: InvoicesCommandService,
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
    const session = await this.prisma.paymentSession.findUnique({
      where: { id: token },
      select: {
        shortUrl: true,
        paymentLink: true,
        status: true,
      },
    });

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

  private async proxyPrescriptionPdf(
    prescriptionId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<PublicPdfResult> {
    try {
      const prescription = await this.prisma.prescription.findUnique({
        where: { id: prescriptionId },
        select: {
          pdfUrl: true,
          clinicId: true,
          appointment: { select: { clinicId: true } },
        },
      });

      if (!prescription) throw new NotFoundException('Prescription not found');

      const clinicId =
        prescription.clinicId ?? prescription.appointment?.clinicId;
      if (!clinicId) throw new NotFoundException('Prescription not found');

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
    } catch (error) {
      this.logAccess({
        type: 'prescription',
        documentId: prescriptionId,
        clinicId: '',
        ipAddress,
        userAgent,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async proxyInvoicePdf(
    invoiceId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<PublicPdfResult> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: {
          pdfUrl: true,
          clinicId: true,
          appointment: { select: { clinicId: true } },
        },
      });

      if (!invoice) throw new NotFoundException('Invoice not found');

      const clinicId = invoice.clinicId ?? invoice.appointment?.clinicId;
      if (!clinicId) throw new NotFoundException('Invoice not found');

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

      const buffer = await this.invoicesQueryService.generatePDF(
        invoiceId,
        clinicId,
      );

      const invoiceDetail = await this.invoicesQueryService.findOne(
        invoiceId,
        clinicId,
      );
      await this.invoicesCommandService.uploadAndPersist(
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
    } catch (error) {
      this.logAccess({
        type: 'invoice',
        documentId: invoiceId,
        clinicId: '',
        ipAddress,
        userAgent,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
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
