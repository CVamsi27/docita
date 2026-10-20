import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  IOrderProvider,
  ORDER_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports/order-provider.port';
import { RazorpayInvoiceWebhookService } from './razorpay-invoice-webhook.service';

const RECONCILIATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECONCILIATION_BATCH_SIZE = 50;

interface PaymentCaptureReconciliationSummary {
  scanned: number;
  captured: number;
  alreadyCaptured: number;
  unmatched: number;
  failed: number;
}

/**
 * Durable recovery for captures whose webhook delivery never completed.
 *
 * Webhook deliveries are acknowledged once received (so the provider stops
 * retrying) and the ingress replay-dedupe window is short, which means a
 * handler failure or a crash after provider success can leave a paid session
 * unpaid locally. This job reads the provider's payments for recent open
 * sessions and applies a captured payment through the same atomic claim the
 * webhook path uses, so a late webhook cannot double-apply.
 */
// AuditLogged: every recovery persists the provider payment payload on the
// payment session through the same atomic capture path as a webhook delivery.
@Injectable()
export class PaymentCaptureReconciliationService {
  private readonly logger = new Logger(
    PaymentCaptureReconciliationService.name,
  );

  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly repository: IPaymentSessionRepository,
    @Inject(ORDER_PROVIDER_TOKEN)
    private readonly orderProvider: IOrderProvider,
    private readonly webhookService: RazorpayInvoiceWebhookService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async reconcileRecentCaptures(): Promise<PaymentCaptureReconciliationSummary> {
    const createdSince = new Date(
      this.clock.now().getTime() - RECONCILIATION_WINDOW_MS,
    );
    const candidates = await this.repository.findReconciliationCandidates(
      createdSince,
      RECONCILIATION_BATCH_SIZE,
    );

    const summary: PaymentCaptureReconciliationSummary = {
      scanned: candidates.length,
      captured: 0,
      alreadyCaptured: 0,
      unmatched: 0,
      failed: 0,
    };

    for (const session of candidates) {
      if (!session.providerSessionId) continue;

      const payments = await this.orderProvider.listOrderPayments(
        session.providerSessionId,
      );
      const captured = payments.find(
        (payment) => payment.status === 'captured',
      );
      if (!captured) {
        summary.unmatched += 1;
        continue;
      }

      try {
        const applied = await this.webhookService.applyReconciledCapture(
          session,
          {
            providerPaymentId: captured.id,
            amountPaise: captured.amount.toCents(),
            currency: captured.amount.currency,
          },
        );
        if (applied) {
          summary.captured += 1;
        } else {
          summary.alreadyCaptured += 1;
        }
      } catch (error) {
        summary.failed += 1;
        this.logger.error(
          `Payment reconciliation failed for session ${session.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (summary.captured > 0 || summary.failed > 0) {
      this.logger.log(
        `Payment capture reconciliation: ${JSON.stringify(summary)}`,
      );
    }

    return summary;
  }
}
