import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { PushNotificationService } from '@/shared/modules/messaging/notifications/push-notification.service';
import {
  IPaymentLinkProvider,
  PAYMENT_LINK_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports/payment-link-provider.port';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import { PaymentSessionStatus, Prisma, InvoiceStatus } from '@workspace/db';
import type { PaymentWebhookPayload } from '@workspace/types';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/invoice.repository';

@Injectable()
export class PaymentsService {
  private logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly repository: IPaymentSessionRepository,
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    private sendMessage: SendMessageUseCase,
    private pushNotifications: PushNotificationService,
    private configService: AppConfigService,
    @Inject(PAYMENT_LINK_PROVIDER_TOKEN)
    private paymentLinkProvider: IPaymentLinkProvider,
  ) {}

  private resolveInvoiceClinicId(
    invoice: Awaited<ReturnType<IInvoiceRepository['findById']>>,
  ): string | undefined {
    return invoice?.clinicId ?? invoice?.patient?.clinic?.id;
  }

  private async getClinicInvoice(invoiceId: string, clinicId: string) {
    const invoice = await this.invoiceRepository.findById(invoiceId, clinicId);
    if (!invoice || this.resolveInvoiceClinicId(invoice) !== clinicId) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async createPaymentSession(dto: {
    invoiceId: string;
    amount: number;
    currency: string;
    patientId: string;
    clinicId: string;
    description?: string;
    paymentMode?: 'ONLINE' | 'CASH';
  }) {
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.configService.getPaymentLinkTtlMinutes(),
    );

    const amountInPaise = Math.round(dto.amount * 100);
    const invoice = await this.getClinicInvoice(dto.invoiceId, dto.clinicId);

    if (invoice.patientId !== dto.patientId) {
      throw new BadRequestException(
        'Payment session patient does not match invoice patient',
      );
    }

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

    const patient = invoice?.patient;
    const customerName = `${patient?.firstName || ''} ${
      patient?.lastName || ''
    }`.trim();
    const customerPhone = patient?.phoneNumber || '';
    const customerEmail = patient?.email || undefined;

    let paymentLinkResponse;

    try {
      const amount = new Money(dto.amount, dto.currency);

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

  async sendPaymentLinkWhatsApp(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session || !session.patient || !session.clinic) {
      return;
    }

    const patientName = `${session.patient.firstName} ${session.patient.lastName}`;
    const amount = (session.amount / 100).toFixed(2);
    const link = session.shortUrl || session.paymentLink;

    if (!link) return;

    try {
      await this.sendMessage.execute({
        recipientPhone: session.patient.phoneNumber,
        templateName: 'payment_link',
        variables: {
          patient_name: patientName,
          amount,
          payment_link: link,
          clinic_name: session.clinicId,
        },
        clinicId: session.clinicId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment link WhatsApp for session ${sessionId}`,
        error,
      );
    }
  }

  async createPaymentLink(dto: {
    invoiceId: string;
    amount: number;
    currency: string;
    patientId: string;
    clinicId: string;
    description?: string;
    paymentMode?: 'ONLINE' | 'CASH';
    sendWhatsApp?: boolean;
  }) {
    const session = await this.createPaymentSession(dto);

    if (dto.paymentMode !== 'CASH' && dto.sendWhatsApp !== false) {
      await this.sendPaymentLinkWhatsApp(session.id);
    }

    return {
      id: session.id,
      link: session.paymentLink,
      shortUrl: session.shortUrl,
      status: session.status,
      expiresAt: session.expiresAt,
    };
  }

  async verifySessionOwnership(sessionId: string, clinicId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session || session.clinicId !== clinicId) {
      throw new BadRequestException(
        'Payment session not found or access denied',
      );
    }
    return session;
  }

  async getPaymentSession(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new BadRequestException('Payment session not found');
    }
    return session;
  }

  async markInvoicePaidManually(data: {
    invoiceId: string;
    clinicId: string;
    performedByUserId: string;
    paymentMethod: string;
    amount?: number;
    notes?: string;
  }) {
    const invoice = await this.getClinicInvoice(data.invoiceId, data.clinicId);

    await this.invoiceRepository.update(
      invoice.id,
      {
        status: InvoiceStatus.PAID,
      },
      data.clinicId,
    );

    if (!invoice.patientId) {
      throw new BadRequestException(
        'Cannot record manual payment: invoice is not linked to a patient',
      );
    }

    const resolvedAmount =
      typeof data.amount === 'number' && data.amount > 0
        ? data.amount
        : invoice.total;

    await this.repository.create({
      clinic: { connect: { id: data.clinicId } },
      invoice: { connect: { id: data.invoiceId } },
      patient: { connect: { id: invoice.patientId } },
      provider: 'manual',
      amount: Math.round(resolvedAmount * 100),
      currency: this.configService.getCurrencyCode(),
      status: PaymentSessionStatus.CAPTURED,
      expiresAt: new Date(),
      meta: {
        method: data.paymentMethod,
        performedBy: data.performedByUserId,
        amount: resolvedAmount,
        notes: data.notes,
      },
    });

    this.logger.log(
      `Invoice ${data.invoiceId} marked as paid manually by ${data.performedByUserId}`,
    );

    return { success: true };
  }

  handleRazorpayWebhook(_payload: PaymentWebhookPayload, signature: string) {
    this.logger.log(`Received Razorpay webhook with signature: ${signature}`);

    return { status: 'ok' };
  }
}
