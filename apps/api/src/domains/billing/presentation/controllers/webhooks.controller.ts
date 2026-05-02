import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UsePipes,
  Req,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from '@/domains/billing/application/services/payments.service';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { WebhookErrorHandlingService } from '@/domains/webhooks/application/services/webhook-error-handling.service';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
  paymentWebhookPayloadSchema,
  type PaymentWebhookPayload,
} from '@workspace/types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { WebhookVerifierService } from '@/shared/modules/webhooks';

@Controller('webhooks/payments')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookErrorHandler: WebhookErrorHandlingService,
    private readonly configService: AppConfigService,
    private readonly webhookVerifier: WebhookVerifierService,
  ) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(paymentWebhookPayloadSchema))
  async handleRazorpayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-forwarded-for') ipAddress: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Body() payload: PaymentWebhookPayload,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const verification = await this.webhookVerifier.verify({
      provider: 'razorpay',
      rawBody,
      signature,
      secret: this.configService.getRazorpayWebhookSecret(),
    });

    if (!verification.ok) {
      this.logger.warn('Razorpay webhook verification failed', {
        ipAddress,
        userAgent,
        event: payload?.event,
        failure: verification.failure,
      });
      if (verification.failure === 'replayed') {
        throw new ConflictException('Webhook already processed');
      }
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const paymentLinkId = 'razorpay_webhook';

    try {
      this.paymentsService.handleRazorpayWebhook(payload, signature);

      await this.webhookErrorHandler.trackWebhookEvent(
        payload.event,
        paymentLinkId,
        'SUCCESS',
      );

      return { status: 'ok' };
    } catch (error) {
      const err = error as Error;

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

      await this.webhookErrorHandler.trackWebhookEvent(
        payload.event,
        paymentLinkId,
        'FAILED',
        err,
      );

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
