import {
  Injectable,
  Logger,
  BadRequestException,
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
import { PaymentSessionStatus } from '@workspace/db';
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
import { InvoiceSettlementService } from './invoice-settlement.service';
import { isDocitaOnlinePaymentSession } from '@/domains/billing/core/rules/docita-online-payment-session';
import { toPaiseAmount } from './payment-amount.util';
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
    private readonly settlement: InvoiceSettlementService,
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

    const amountInPaise = toPaiseAmount(dto.amount);

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

  /**
   * Record a manual front-desk settlement against an invoice. The actual
   * "compute paid-state → record session → roll up the invoice" flow lives
   * in `InvoiceSettlementService`, shared with `applyAppointmentAdvance` —
   * this stays a thin pass-through so the public API here is unchanged.
   */
  async markInvoicePaidManually(
    data: Parameters<InvoiceSettlementService['markInvoicePaidManually']>[0],
  ) {
    return this.settlement.markInvoicePaidManually(data);
  }

  /**
   * Apply an advance collected at booking to the appointment's freshly-created
   * invoice as a settled manual payment — delegates to `InvoiceSettlementService`
   * (see `markInvoicePaidManually` for why this stays a thin pass-through).
   */
  async applyAppointmentAdvance(invoiceId: string, clinicId: string) {
    return this.settlement.applyAppointmentAdvance(invoiceId, clinicId);
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
}
