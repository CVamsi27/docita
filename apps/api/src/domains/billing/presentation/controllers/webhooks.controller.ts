import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UsePipes,
} from '@nestjs/common';
import { PaymentsService } from '../../application/services/payments.service';
import { Public } from '../../../../shared/modules/auth/auth/public.decorator';
import { WebhookErrorHandlingService } from '../../../webhooks/application/services/webhook-error-handling.service';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  paymentWebhookPayloadSchema,
  type PaymentWebhookPayload,
} from '@workspace/types';

@Controller('webhooks/payments')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookErrorHandler: WebhookErrorHandlingService,
  ) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(paymentWebhookPayloadSchema))
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-forwarded-for') ipAddress: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Body() payload: PaymentWebhookPayload,
  ) {
    const paymentLinkId = 'razorpay_webhook';

    try {
      // Process webhook - already has internal error handling
      await this.paymentsService.handleRazorpayWebhook(payload, signature);

      // Track successful webhook processing
      await this.webhookErrorHandler.trackWebhookEvent(
        payload.event,
        paymentLinkId,
        'SUCCESS',
      );

      return { status: 'ok' };
    } catch (error) {
      const err = error as Error;

      // Log webhook error with context
      const isCritical = this.webhookErrorHandler.isCriticalError(
        err,
        payload.event,
      );

      await this.webhookErrorHandler.logWebhookError(
        err,
        {
          eventType: payload.event,
          providerId: paymentLinkId,
          payload,
          ipAddress,
          userAgent,
        },
        isCritical,
      );

      // Track failed webhook processing
      await this.webhookErrorHandler.trackWebhookEvent(
        payload.event,
        paymentLinkId,
        'FAILED',
        err,
      );

      // IMPORTANT: Still return 200 to Razorpay to prevent retries of bad webhooks
      // Error is logged and can be investigated via error tracking
      this.logger.error(`Razorpay webhook error for event ${payload.event}`, {
        error: err.message,
        paymentLinkId,
        isCritical,
      });

      return {
        status: 'ok',
        error:
          'Webhook processing encountered an error. Event has been logged for review.',
      };
    }
  }
}
