import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import {
  IPaymentLinkProvider,
  CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports/payment-link-provider.port';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import { PaymentSessionStatus, InvoiceStatus } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type { PaymentWebhookPayload } from '@workspace/types';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
  PaymentSessionDetail,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/invoice.repository';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  TRANSACTION_RUNNER_PORT,
  type ITransactionRunner,
} from '@/shared/common/ports/transaction-runner.port';
import { RazorpayInvoiceWebhookService } from './razorpay-invoice-webhook.service';
import { isDocitaOnlinePaymentSession } from '@/domains/billing/core/rules/docita-online-payment-session';
import { DATE_FORMATS, formatDate, getPatientFullName } from '@workspace/utils';
import {
  buildPaymentLinkVariables,
  buildPaymentReminderVariables,
} from '@/shared/whatsapp/patient-whatsapp-template-variables';

type PaymentSessionWithRecipient = PaymentSessionDetail & {
  patient: NonNullable<PaymentSessionDetail['patient']>;
  clinic: NonNullable<PaymentSessionDetail['clinic']>;
};

function hasPaymentRecipient(
  session: PaymentSessionDetail | null,
): session is PaymentSessionWithRecipient {
  return Boolean(session?.patient && session.clinic);
}

/**
 * Clinic invoice payment mutations (sessions, links, manual settlement).
 */
// AuditLogged: payment sessions, links, manual settlement, and Razorpay webhook handling
@Injectable()
export class PaymentsCommandService {
  private readonly logger = new Logger(PaymentsCommandService.name);

  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly repository: IPaymentSessionRepository,
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly sendMessage: SendMessageUseCase,
    private readonly configService: AppConfigService,
    @Inject(CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN)
    private readonly paymentLinkProvider: IPaymentLinkProvider,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: ITransactionRunner,
    private readonly razorpayInvoiceWebhook: RazorpayInvoiceWebhookService,
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
    this.logger.log({
      action: 'payment.process',
      clinicId: dto.clinicId,
      invoiceId: dto.invoiceId,
      paymentMode: dto.paymentMode ?? 'ONLINE',
    });

    const expiresAt = this.clock.now();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.configService.getPaymentLinkTtlMinutes(),
    );

    const amountInPaise = this.toPaise(dto.amount);

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
      meta: toPrismaInputJsonValue({
        paymentLinkId: paymentLinkResponse.id,
        url: paymentLinkResponse.url,
        shortUrl: paymentLinkResponse.shortUrl,
        status: paymentLinkResponse.status,
      }),
    });

    this.logger.log(
      `Created payment session ${session.id} for invoice ${dto.invoiceId}`,
    );

    return session;
  }

  async sendPaymentLinkWhatsApp(sessionId: string, clinicId: string) {
    await this.sendWhatsAppForSession(
      sessionId,
      clinicId,
      'payment_link',
      (session) =>
        buildPaymentLinkVariables({
          patientName: getPatientFullName(session.patient),
          clinicName: session.clinic.name,
          amount: session.amount / 100,
          currency: session.currency,
          paymentSessionId: sessionId,
        }),
    );
  }

  async sendPaymentReminderWhatsApp(sessionId: string, clinicId: string) {
    await this.sendWhatsAppForSession(
      sessionId,
      clinicId,
      'payment_reminder',
      (session) =>
        buildPaymentReminderVariables({
          clinicName: session.clinic.name,
          patientName: getPatientFullName(session.patient),
          amount: session.amount / 100,
          currency: session.currency,
          dueDate: session.invoice?.dueDate
            ? formatDate(session.invoice.dueDate, DATE_FORMATS.DATE_MEDIUM)
            : '—',
          paymentSessionId: sessionId,
        }),
    );
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
      await this.sendPaymentLinkWhatsApp(session.id, dto.clinicId);
    }

    return {
      id: session.id,
      link: session.paymentLink,
      shortUrl: session.shortUrl,
      status: session.status,
      expiresAt: session.expiresAt,
    };
  }

  async markInvoicePaidManually(data: {
    invoiceId: string;
    clinicId: string;
    performedByUserId: string;
    paymentMethod: string;
    amount?: number;
    notes?: string;
    reference?: string;
  }) {
    const invoice = await this.invoiceRepository.findById(
      data.invoiceId,
      data.clinicId,
    );
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.patientId) {
      throw new BadRequestException(
        'Cannot record manual payment: invoice is not linked to a patient',
      );
    }

    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot record payment: invoice is already ${invoice.status}`,
      );
    }

    const normalizedChannel =
      data.paymentMethod === 'OTHER' ? 'OTHER_ONLINE' : data.paymentMethod;

    const invoiceTotal = invoice.totalCents / 100;
    const resolvedAmount =
      typeof data.amount === 'number' && data.amount > 0
        ? data.amount
        : invoiceTotal;

    await this.transactionRunner.runInTransaction(async (tx) => {
      await this.repository.create(
        {
          clinic: { connect: { id: data.clinicId } },
          invoice: { connect: { id: data.invoiceId } },
          patient: { connect: { id: invoice.patientId } },
          provider: 'manual',
          amount: this.toPaise(resolvedAmount),
          currency: this.configService.getCurrencyCode(),
          status: PaymentSessionStatus.CAPTURED,
          expiresAt: this.clock.now(),
          meta: {
            channel: normalizedChannel,
            method: normalizedChannel,
            performedBy: data.performedByUserId,
            amount: resolvedAmount,
            notes: data.notes,
            reference: data.reference,
          },
        },
        tx,
      );

      await this.invoiceRepository.update(
        invoice.id,
        { status: InvoiceStatus.PAID },
        data.clinicId,
        tx,
      );
    });

    this.logger.log(
      `Invoice ${data.invoiceId} marked paid manually by ${data.performedByUserId}`,
    );

    return { success: true };
  }

  async handleRazorpayWebhook(
    payload: PaymentWebhookPayload,
    signature: string,
  ) {
    return this.razorpayInvoiceWebhook.handle(payload, signature);
  }

  private async sendWhatsAppForSession(
    sessionId: string,
    clinicId: string,
    templateName: string,
    buildVariables: (
      session: PaymentSessionWithRecipient,
    ) => Record<string, string>,
  ) {
    const session = await this.repository.findById(sessionId, clinicId);
    if (!hasPaymentRecipient(session)) {
      return;
    }

    if (!isDocitaOnlinePaymentSession(session)) {
      this.logger.log(
        `Payment WhatsApp skipped for session ${sessionId}: not a Docita online payment session`,
      );
      return;
    }

    try {
      await this.sendMessage.execute({
        recipientPhone: session.patient.phoneNumber,
        templateName,
        variables: buildVariables(session),
        clinicId: session.clinicId,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        this.logger.log(
          `WhatsApp ${templateName} skipped for session ${sessionId}: ${error.message}`,
        );
        return;
      }
      this.logger.error(
        `Failed to send WhatsApp ${templateName} for session ${sessionId}`,
        error,
      );
    }
  }

  private toPaise(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Payment amount must be non-negative');
    }
    const paise = Math.round(amount * 100);
    if (Math.abs(paise / 100 - amount) > Number.EPSILON) {
      throw new BadRequestException(
        'Payment amount must have at most two decimal places',
      );
    }
    return paise;
  }
}
