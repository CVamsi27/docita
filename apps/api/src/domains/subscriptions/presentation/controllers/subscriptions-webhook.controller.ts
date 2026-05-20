import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { ProcessWebhookUseCase } from '@/domains/subscriptions/application/use-cases';
import type { RazorpayWebhookPayload } from '@workspace/types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { WebhookVerifierService } from '@/shared/modules/webhooks';
import { assertVerifiedRazorpayWebhook } from '@/shared/modules/webhooks/razorpay-webhook-verification.helper';

@Controller('webhooks/subscriptions')
export class SubscriptionsWebhookController {
  constructor(
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    private readonly webhookVerifier: WebhookVerifierService,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: RazorpayWebhookPayload,
  ) {
    const rawBody = await assertVerifiedRazorpayWebhook({
      req,
      signature,
      secret: this.configService.getRazorpayWebhookSecret(),
      verifier: this.webhookVerifier,
    });

    return this.processWebhookUseCase.execute(
      signature,
      rawBody.toString('utf-8'),
      payload,
    );
  }
}
