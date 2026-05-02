import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { ProcessWebhookUseCase } from '@/domains/subscriptions/application/use-cases';
import type { RazorpayWebhookPayload } from '@workspace/types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { WebhookVerifierService } from '@/shared/modules/webhooks';

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
    if (!signature) {
      throw new BadRequestException('Missing signature');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    const verification = await this.webhookVerifier.verify({
      provider: 'razorpay',
      rawBody,
      signature,
      secret: this.configService.getRazorpayWebhookSecret(),
    });

    if (!verification.ok) {
      if (verification.failure === 'replayed') {
        throw new ConflictException('Webhook already processed');
      }
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return this.processWebhookUseCase.execute(
      signature,
      rawBody.toString('utf-8'),
      payload,
    );
  }
}
