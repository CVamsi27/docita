import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import type { PaymentWebhookPayload } from '@workspace/types';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/invoice.repository';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  TRANSACTION_RUNNER_PORT,
  type ITransactionRunner,
} from '@/shared/common/ports/transaction-runner.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';

// AuditLogged: Razorpay invoice webhooks persist provider payloads on the
// payment session and transition the linked invoice inside one transaction.
@Injectable()
export class RazorpayInvoiceWebhookService {
  private readonly logger = new Logger(RazorpayInvoiceWebhookService.name);

  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly repository: IPaymentSessionRepository,
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: ITransactionRunner,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    @Inject('IOutboxService') private readonly outbox: IOutboxService,
  ) {}

  async handle(payload: PaymentWebhookPayload, signature: string) {
    this.logger.log('Received Razorpay webhook', {
      event: payload?.event,
      signaturePresent: typeof signature === 'string' && signature.length > 0,
    });

    if (payload.event === 'payment.captured' && payload.payload.payment) {
      await this.handlePaymentCaptured(payload);
      return { status: 'ok' };
    }

    if (payload.event === 'payment_link.paid' && payload.payload.payment_link) {
      await this.handlePaymentLinkPaid(payload);
      return { status: 'ok' };
    }

    this.logger.log('Ignored Razorpay webhook event', { event: payload.event });
    return { status: 'ignored' };
  }

  private async handlePaymentCaptured(
    payload: PaymentWebhookPayload,
  ): Promise<void> {
    const payment = payload.payload.payment?.entity;
    if (!payment) {
      throw new BadRequestException('Razorpay payment payload is missing');
    }

    const existing = await this.repository.findByProviderPaymentId(
      'razorpay',
      payment.id,
    );
    if (existing) return;

    const session = await this.repository.findByProviderSessionId(
      payment.order_id,
    );
    if (!session || !session.invoiceId || !session.patientId) {
      throw new BadRequestException(
        'Razorpay payment could not be matched to a payment session',
      );
    }

    await this.capturePaymentSession(
      session,
      payment.id,
      payment.amount,
      payload,
    );
  }

  private async handlePaymentLinkPaid(
    payload: PaymentWebhookPayload,
  ): Promise<void> {
    const link = payload.payload.payment_link?.entity;
    if (!link) {
      throw new BadRequestException('Razorpay payment link payload is missing');
    }

    const session = await this.repository.findByProviderSessionId(link.id);
    if (!session || !session.invoiceId || !session.patientId) {
      throw new BadRequestException(
        'Razorpay payment link could not be matched to a payment session',
      );
    }

    await this.capturePaymentSession(
      session,
      `payment_link:${link.id}`,
      link.amount,
      payload,
    );
  }

  private async capturePaymentSession(
    session: { id: string; clinicId: string; invoiceId?: string | null },
    providerPaymentId: string,
    amountPaise: number,
    payload: PaymentWebhookPayload,
  ): Promise<void> {
    if (!session.invoiceId) {
      throw new BadRequestException(
        'Payment session is not linked to an invoice',
      );
    }
    const invoiceId = session.invoiceId;

    await this.transactionRunner.runInTransaction(async (tx) => {
      await this.repository.update(
        session.id,
        {
          status: PaymentSessionStatus.CAPTURED,
          providerPaymentId,
          paidAt: this.clock.now(),
          amount: amountPaise,
          webhookPayload: toPrismaInputJsonValue(payload),
        },
        session.clinicId,
        tx,
      );

      await this.invoiceRepository.update(
        invoiceId,
        { status: InvoiceStatus.PAID },
        session.clinicId,
        tx,
      );

      await this.outbox.append(tx, {
        eventName: ApplicationEvents.PAYMENT_CAPTURED,
        aggregateType: 'Invoice',
        aggregateId: invoiceId,
        clinicId: session.clinicId,
        idempotencyKey: `payment-captured:${providerPaymentId}`,
        payload: {
          invoiceId,
          clinicId: session.clinicId,
          providerPaymentId,
          amountPaise,
        },
      });
    });
  }
}
