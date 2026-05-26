import { Injectable } from '@nestjs/common';
import type { PaymentWebhookPayload } from '@workspace/types';
import { PaymentsCommandService } from './payments-command.service';
import { PaymentsQueryService } from './payments-query.service';

/**
 * Clinic invoice payments: payment sessions (links / cash), manual desk
 * settlement, and related helpers. **Flow B** (patient pays clinic) in
 * docs/product/PAYMENT_FLOWS.md. **Docita SaaS** subscription / platform billing uses
 * other services and tokens — do not conflate webhooks or Docita merchant
 * semantics with patient settlement.
 */
// AuditLogged: payment sessions, links, manual settlement, and Razorpay webhooks (PaymentsCommandService)
@Injectable()
export class PaymentsService {
  constructor(
    private readonly queryService: PaymentsQueryService,
    private readonly commandService: PaymentsCommandService,
  ) {}

  async createPaymentSession(dto: {
    invoiceId: string;
    amount: number;
    currency: string;
    patientId: string;
    clinicId: string;
    description?: string;
    paymentMode?: 'ONLINE' | 'CASH';
  }) {
    // AuditLogged: payment processing
    this.logger.log({
      action: 'payment.process',
      clinicId: dto.clinicId,
      invoiceId: dto.invoiceId,
      paymentMode: dto.paymentMode ?? 'ONLINE',
    });

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.configService.getPaymentLinkTtlMinutes(),
    );

    const amountInPaise = Math.round(dto.amount * 100);

    if (dto.paymentMode === 'CASH') {
      const session = await this.repository.create({
        clinic: { connect: { id: dto.clinicId } },
        invoice: { connect: { id: dto.invoiceId } },
        patient: { connect: { id: dto.patientId } },
        provider: 'cash',
        amount: amountInPaise,
        currency: dto.currency,
        status: PaymentSessionStatus.PENDING,
        expiresAt,
      });
      this.logger.log(
        `Created CASH payment session ${session.id} for invoice ${dto.invoiceId}`,
      );
      return session;
    }

    const invoice = await this.invoiceRepository.findById(
      dto.invoiceId,
      dto.clinicId,
    );
    const patient = invoice?.patient;
    const customerName = `${patient?.firstName || ''} ${
      patient?.lastName || ''
    }`.trim();
    const customerPhone = patient?.phoneNumber || '';
    const customerEmail = patient?.email || undefined;

    let paymentLinkResponse;

    try {
      const amount = new Money(dto.amount, dto.currency);

      // Flow B online link: must use clinic gateway creds from settings (Flow A);
      // interim shared adapter must not be Docita merchant for new work — see
      // docs/product/PAYMENT_FLOWS.md.
      paymentLinkResponse = await this.paymentLinkProvider.createPaymentLink({
        amount,
        description: dto.description || `Invoice #${dto.invoiceId.slice(0, 8)}`,
        customer: {
          name: customerName || dto.patientId,
          email: customerEmail,
          phone: customerPhone,
        },
        callbackUrl: `${this.configService.getFrontendAppUrl()}/payment/callback`,
      });
    } catch (error) {
      this.logger.error('Failed to create payment link', error);
      throw new BadRequestException('Failed to create payment link');
    }

    const session = await this.repository.create({
      clinic: { connect: { id: dto.clinicId } },
      invoice: { connect: { id: dto.invoiceId } },
      patient: { connect: { id: dto.patientId } },
      provider: 'razorpay',
      providerSessionId: paymentLinkResponse.id,
      paymentLink: paymentLinkResponse.shortUrl || paymentLinkResponse.url,
      shortUrl: paymentLinkResponse.shortUrl || paymentLinkResponse.url,
      amount: amountInPaise,
      currency: dto.currency,
      status: PaymentSessionStatus.CREATED,
      expiresAt,
      meta: {
        paymentLinkId: paymentLinkResponse.id,
        url: paymentLinkResponse.url,
        shortUrl: paymentLinkResponse.shortUrl,
        status: paymentLinkResponse.status,
      } as Prisma.InputJsonValue,
    });

    this.logger.log(
      `Created payment session ${session.id} for invoice ${dto.invoiceId}`,
    );

    return session;
  }

  sendPaymentLinkWhatsApp(sessionId: string, clinicId: string) {
    return this.commandService.sendPaymentLinkWhatsApp(sessionId, clinicId);
  }

  createPaymentLink(
    dto: Parameters<PaymentsCommandService['createPaymentLink']>[0],
  ) {
    return this.commandService.createPaymentLink(dto);
  }

  verifySessionOwnership(sessionId: string, clinicId: string) {
    return this.queryService.verifySessionOwnership(sessionId, clinicId);
  }

  getPaymentSession(sessionId: string, clinicId: string) {
    return this.queryService.getPaymentSession(sessionId, clinicId);
  }

  markInvoicePaidManually(
    data: Parameters<PaymentsCommandService['markInvoicePaidManually']>[0],
  ) {
    return this.commandService.markInvoicePaidManually(data);
  }

  handleRazorpayWebhook(payload: PaymentWebhookPayload, signature: string) {
    return this.commandService.handleRazorpayWebhook(payload, signature);
  }
}
