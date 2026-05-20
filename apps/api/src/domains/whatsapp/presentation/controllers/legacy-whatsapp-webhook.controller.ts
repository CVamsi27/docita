import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { WhatsappWebhookService } from '@/domains/whatsapp/application/services/whatsapp-webhook.service';
import { readWhatsAppWebhookVerificationQuery } from '@/shared/whatsapp/whatsapp-webhook-query.util';
import type { WhatsAppWebhookPayload } from '@workspace/types';

/**
 * Legacy Meta webhook at `/whatsapp/webhook` (fail-open on bad signature).
 *
 * Prefer `GET/POST /webhooks/whatsapp` (strict verification + replay protection).
 * Both paths call {@link HandleWebhookUseCase}; retire this controller after Meta cutover.
 */
@Controller('whatsapp')
export class LegacyWhatsappWebhookController {
  private readonly logger = new Logger(LegacyWhatsappWebhookController.name);

  constructor(
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
    private readonly whatsappWebhook: WhatsappWebhookService,
  ) {}

  @Public()
  @Get('webhook')
  handleWebhookVerification(@Req() req: Request) {
    const {
      mode,
      verifyToken: token,
      challenge,
    } = readWhatsAppWebhookVerificationQuery(req.query);
    this.logger.log(`Webhook verification request: mode=${mode}`);

    if (
      mode === 'subscribe' &&
      token === this.whatsappWebhook.getVerifyToken() &&
      challenge
    ) {
      this.logger.log('Webhook verified successfully');
      return parseInt(challenge, 10);
    }

    this.logger.warn('Webhook verification failed - invalid token');
    throw new BadRequestException('Webhook verification failed');
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIncomingWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.warn(
      'Legacy POST /whatsapp/webhook received; migrate Meta callback URL to POST /webhooks/whatsapp',
    );

    if (!req.rawBody || !signature) {
      this.logger.warn('Webhook rejected: missing rawBody or signature header');
      return 'OK';
    }

    const isValid = this.whatsappWebhook.validateWebhookSignature(
      req.rawBody,
      signature,
    );
    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
      return 'OK';
    }

    try {
      await this.handleWebhookUseCase.execute({ payload });
      return 'OK';
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return 'OK';
    }
  }
}
