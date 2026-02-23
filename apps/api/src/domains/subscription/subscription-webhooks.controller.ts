import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  RawBodyRequest,
  Req,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { SubscriptionWebhookService } from './subscription-webhook.service';
import type { RazorpayWebhookPayload } from '@workspace/types';
import { Public } from '../../shared/modules/auth/auth/public.decorator';
import { WebhookErrorHandlingService } from '../../common/services/webhook-error-handling.service';

@Controller('webhooks/subscriptions')
@SkipThrottle()
export class SubscriptionWebhooksController {
  private readonly logger = new Logger(SubscriptionWebhooksController.name);

  constructor(
    private readonly webhookService: SubscriptionWebhookService,
    private readonly webhookErrorHandler: WebhookErrorHandlingService,
  ) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-forwarded-for') ipAddress: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: RazorpayWebhookPayload,
  ) {
    const rawBody = request.rawBody?.toString() || JSON.stringify(payload);
    const subscriptionId =
      payload.payload.subscription?.entity?.id || 'unknown';

    try {
      await this.webhookService.processWebhook(signature, rawBody, payload);

      // Track successful webhook processing
      await this.webhookErrorHandler.trackWebhookEvent(
        payload.event,
        subscriptionId,
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
          providerId: subscriptionId,
          payload: payload as unknown as Record<string, unknown>,
          ipAddress,
          userAgent,
        },
        isCritical,
      );

      // Track failed webhook processing
      await this.webhookErrorHandler.trackWebhookEvent(
        payload.event,
        subscriptionId,
        'FAILED',
        err,
      );

      // IMPORTANT: Still return 200 to Razorpay to prevent retries
      // Error is logged and can be investigated via error tracking
      this.logger.error(
        `Razorpay subscription webhook error for event ${payload.event}`,
        {
          error: err.message,
          subscriptionId,
          isCritical,
        },
      );

      return {
        status: 'ok',
        error:
          'Webhook processing encountered an error. Event has been logged for review.',
      };
    }
  }
}
