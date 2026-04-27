import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PDFService } from '@/domains/billing/application/services/pdf.service';
import {
  extractPdfTheme,
  invoiceTaxSummarySchema,
  taxRegistrationSnapshotSchema,
  type InvoiceTaxSummary,
  type TaxRegistrationSnapshot,
} from '@workspace/types';

@Injectable()
export class SubscriptionPaymentPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PDFService,
  ) {}

  async generate(paymentId: string, clinicId: string): Promise<Buffer> {
    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: { id: paymentId, clinicId },
      include: {
        clinic: true,
      },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    const clinic = payment.clinic;
    if (!clinic?.name) {
      throw new BadRequestException('Clinic details are required');
    }

    const taxSummary = this.parseTaxSummary(payment.taxSummary);
    const sellerTaxSnapshot = this.parseTaxSnapshot(payment.sellerTaxSnapshot);
    const buyerTaxSnapshot = this.parseTaxSnapshot(payment.buyerTaxSnapshot);

    const invoiceId =
      payment.invoiceNumber ??
      (payment.razorpayOrderId
        ? payment.razorpayOrderId.slice(0, 12).toUpperCase()
        : payment.id.slice(0, 12).toUpperCase());

    const issuedAt = payment.paidAt ?? payment.createdAt;
    const status = payment.status?.toUpperCase?.() ?? 'PENDING';

    return this.pdfService.generate({
      invoiceId,
      title: taxSummary?.documentTitle ?? 'Tax Invoice',
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phone || undefined,
        email: clinic.email || undefined,
        logo: clinic.logo || undefined,
        currency: clinic.currency || undefined,
        branding: extractPdfTheme(clinic.branding),
        gstin: sellerTaxSnapshot?.registrationId ?? undefined,
      },
      // Subscription payments are clinic-to-Docita; reuse the buyer snapshot as the rendered "patient" block.
      patient: {
        name: buyerTaxSnapshot?.legalName ?? clinic.name,
        phoneNumber: clinic.phone || '',
        email: clinic.email || undefined,
        address: clinic.address || undefined,
        patientId: clinic.id.slice(0, 8).toUpperCase(),
      },
      taxSummary: taxSummary ?? undefined,
      sellerTaxSnapshot: sellerTaxSnapshot ?? undefined,
      buyerTaxSnapshot: buyerTaxSnapshot ?? undefined,
      items: [
        {
          description: payment.description ?? 'Subscription',
          quantity: 1,
          unitPrice: payment.subtotalCents
            ? payment.subtotalCents / 100
            : payment.amountCents / 100,
          amount: payment.grandTotalCents
            ? payment.grandTotalCents / 100
            : payment.amountCents / 100,
        },
      ],
      date: issuedAt,
      status,
    });
  }

  private parseTaxSummary(value: unknown): InvoiceTaxSummary | undefined {
    const parsed = invoiceTaxSummarySchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  }

  private parseTaxSnapshot(
    value: unknown,
  ): TaxRegistrationSnapshot | undefined {
    const parsed = taxRegistrationSnapshotSchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  }
}
