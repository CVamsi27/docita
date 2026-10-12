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
  type PaymentSessionDetail,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  TRANSACTION_RUNNER_PORT,
  type ITransactionRunner,
} from '@/shared/common/ports/transaction-runner.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';

/** A provider-confirmed capture recovered by reconciliation, not by a webhook delivery. */
interface ReconciledProviderCapture {
  providerPaymentId: string;
  amountPaise: number;
  currency: string;
}

/** Session fields the capture path needs; both webhook and reconciliation supply these. */
type CapturableSession = Pick<
  PaymentSessionDetail,
  | 'id'
  | 'clinicId'
  | 'invoiceId'
  | 'patientId'
  | 'amount'
  | 'currency'
  | 'providerSessionId'
>;

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
    if (!payment)
      throw new BadRequestException('Razorpay payment payload is missing');

    const existing = await this.repository.findByProviderPaymentId(
      'razorpay',
      payment.id,
    );
    if (existing) {
      this.logger.log(`Ignoring duplicate payment.captured for ${payment.id}`);
      return;
    }

    const session = await this.repository.findByProviderSessionId(
      payment.order_id,
    );
    if (!session || !session.invoiceId || !session.patientId)
      throw new BadRequestException(
        'Razorpay payment could not be matched to a payment session',
      );

    await this.capturePaymentSession(
      session,
      payment.id,
      payment.amount,
      payload,
      payment.currency,
    );
  }

  private async handlePaymentLinkPaid(
    payload: PaymentWebhookPayload,
  ): Promise<void> {
    const link = payload.payload.payment_link?.entity;
    if (!link)
      throw new BadRequestException('Razorpay payment link payload is missing');
    if (link.status !== 'paid') {
      this.logger.warn(
        `Ignoring payment_link.paid delivery with status ${link.status}`,
      );
      return;
    }

    // Deliveries retried beyond the ingress replay-dedupe window (10 min)
    // must not re-apply the capture; the provider payment id is the
    // delivery's identity.
    const providerPaymentId = `payment_link:${link.id}`;
    const existing = await this.repository.findByProviderPaymentId(
      'razorpay',
      providerPaymentId,
    );
    if (existing) {
      this.logger.log(`Ignoring duplicate payment_link.paid for ${link.id}`);
      return;
    }

    const session = await this.repository.findByProviderSessionId(link.id);
    if (!session || !session.invoiceId || !session.patientId)
      throw new BadRequestException(
        'Razorpay payment link could not be matched to a payment session',
      );

    await this.capturePaymentSession(
      session,
      providerPaymentId,
      link.amount,
      payload,
    );
  }

  /**
   * Applies a provider-confirmed capture recovered by reconciliation. Shares
   * the atomic claim and amount guard with the webhook path, so a webhook
   * arriving later cannot double-apply the same payment.
   *
   * @returns true when this call published the capture, false when the
   * session was already captured.
   */
  async applyReconciledCapture(
    session: CapturableSession,
    capture: ReconciledProviderCapture,
  ): Promise<boolean> {
    return this.capturePaymentSession(
      session,
      capture.providerPaymentId,
      capture.amountPaise,
      {
        event: 'reconciliation.payment_captured',
        payload: {
          payment: {
            entity: {
              id: capture.providerPaymentId,
              amount: capture.amountPaise,
              currency: capture.currency,
              status: 'captured',
              order_id: session.providerSessionId ?? '',
            },
          },
        },
      },
      capture.currency,
    );
  }

  /**
   * @returns true when this call claimed and published the capture; false
   * when a concurrent webhook delivery or reconciliation run already did.
   */
  private async capturePaymentSession(
    session: CapturableSession,
    providerPaymentId: string,
    amountPaise: number,
    payload: unknown,
    providerCurrency?: string,
  ): Promise<boolean> {
    if (!session.invoiceId)
      throw new BadRequestException(
        'Payment session is not linked to an invoice',
      );
    const invoiceId = session.invoiceId;

    // Wrong-context guard: a capture that does not match the session's
    // expected money must never mark the invoice PAID.
    if (
      amountPaise !== session.amount ||
      (providerCurrency !== undefined && providerCurrency !== session.currency)
    ) {
      this.logger.error(
        `Razorpay capture ${providerPaymentId} (${amountPaise} ${providerCurrency ?? '?'}) ` +
          `does not match session ${session.id} (${session.amount} ${session.currency})`,
      );
      throw new BadRequestException(
        'Razorpay capture does not match the payment session',
      );
    }

    return this.transactionRunner.runInTransaction(async (tx) => {
      const claimed = await this.repository.tryMarkCaptured(
        session.id,
        session.clinicId,
        {
          status: PaymentSessionStatus.CAPTURED,
          providerPaymentId,
          paidAt: this.clock.now(),
          amount: amountPaise,
          webhookPayload: toPrismaInputJsonValue(payload),
        },
        tx,
      );
      if (!claimed) {
        this.logger.log(
          `Payment session ${session.id} was already captured; ignoring duplicate delivery for ${providerPaymentId}`,
        );
        return false;
      }

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

      return true;
    });
  }
}
