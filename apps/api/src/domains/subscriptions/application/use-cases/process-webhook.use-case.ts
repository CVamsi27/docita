import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '@/domains/subscriptions/application/ports';
import { type RazorpayWebhookPayload } from '@workspace/types';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { RazorpayWebhookHandlerRegistry } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-handler.registry';

/**
 * **Docita SaaS** only: Razorpay webhooks for subscription and related platform
 * billing (clinic pays Docita). Not for patient-to-clinic settlement (Flow B)
 * or clinic payment-settings webhooks; see docs/product/PAYMENT_FLOWS.md.
 */
@Injectable()
export class ProcessWebhookUseCase {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
    private readonly adminAlerts: AdminAlertsService,
    private readonly webhookHandlers: RazorpayWebhookHandlerRegistry,
  ) {}

  async execute(
    signature: string,
    rawBody: string,
    payload: RazorpayWebhookPayload,
  ): Promise<void> {
    if (!this.paymentGateway.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Invalid webhook signature');
      await this.adminAlerts.sendAdminAlert({
        alertKey: 'razorpay_webhook_signature_invalid',
        severity: 'warn',
        subject: 'Invalid Razorpay webhook signature',
        text:
          'Received a Razorpay webhook with an invalid signature.\n' +
          `Event: ${payload.event}\n` +
          'Action: Verify RAZORPAY_WEBHOOK_SECRET matches Razorpay dashboard configuration.',
        dedupeWindowMs: 30 * 60 * 1000,
      });
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received webhook event: ${payload.event}`);

    const handler = this.webhookHandlers.getHandler(payload.event);
    if (handler) {
      await handler.handle(payload);
      return;
    }
    this.logger.log(`Unhandled event type: ${payload.event}`);
  }
}
