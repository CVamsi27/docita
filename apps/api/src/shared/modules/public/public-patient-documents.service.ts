import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrescriptionsService } from '@/domains/prescriptions/application/services/prescription.service';
import { InvoicesService } from '@/domains/billing/application/services/invoices.service';
import { PaymentSessionStatus } from '@workspace/db';

type PublicPdfResult =
  | { type: 'redirect'; url: string }
  | { type: 'buffer'; buffer: Buffer; filename: string };

@Injectable()
export class PublicPatientDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prescriptionsService: PrescriptionsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async getPrescriptionPdf(token: string): Promise<PublicPdfResult> {
    const clinicId = await this.resolvePrescriptionClinicId(token);
    return this.toPdfResult(
      await this.prescriptionsService.getPdf(token, clinicId),
      `prescription-${token}.pdf`,
    );
  }

  async getInvoicePdf(token: string): Promise<PublicPdfResult> {
    const clinicId = await this.resolveInvoiceClinicId(token);
    return this.toPdfResult(
      await this.invoicesService.getPdf(token, clinicId),
      `invoice-${token}.pdf`,
    );
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

    if (!session) {
      throw new NotFoundException('Payment link not found');
    }

    if (
      session.status === PaymentSessionStatus.CAPTURED ||
      session.status === PaymentSessionStatus.PAID ||
      session.status === PaymentSessionStatus.EXPIRED ||
      session.status === PaymentSessionStatus.CANCELLED
    ) {
      throw new NotFoundException('Payment link is no longer available');
    }

    const redirectUrl = session.shortUrl?.trim() || session.paymentLink?.trim();
    if (!redirectUrl) {
      throw new NotFoundException('Payment link not found');
    }

    return redirectUrl;
  }

  private async resolvePrescriptionClinicId(
    prescriptionId: string,
  ): Promise<string> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: {
        clinicId: true,
        appointment: { select: { clinicId: true } },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    const clinicId =
      prescription.clinicId ?? prescription.appointment?.clinicId;
    if (!clinicId) {
      throw new NotFoundException('Prescription not found');
    }

    return clinicId;
  }

  private async resolveInvoiceClinicId(invoiceId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        clinicId: true,
        appointment: { select: { clinicId: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const clinicId = invoice.clinicId ?? invoice.appointment?.clinicId;
    if (!clinicId) {
      throw new NotFoundException('Invoice not found');
    }

    return clinicId;
  }

  private toPdfResult(
    result: { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer },
    filename: string,
  ): PublicPdfResult {
    if (result.type === 'url') {
      return { type: 'redirect', url: result.url };
    }

    return { type: 'buffer', buffer: result.buffer, filename };
  }
}
