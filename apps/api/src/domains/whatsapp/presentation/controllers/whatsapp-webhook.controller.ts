import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  HandleWhatsAppWebhookDto,
  WhatsAppWebhookAckResponseDto,
} from '@/domains/whatsapp/application/dto/whatsapp.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { readWhatsAppWebhookVerificationQuery } from '@/shared/whatsapp/whatsapp-webhook-query.util';
import { WebhookVerifierService } from '@/shared/modules/webhooks';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
    private readonly configService: AppConfigService,
    private readonly webhookVerifier: WebhookVerifierService,
  ) {}

  @Public()
  @Get()
  verifyWebhook(@Req() req: Request) {
    const verifyToken = this.configService.getMetaConfig().verifyToken;
    const {
      mode,
      verifyToken: token,
      challenge,
    } = readWhatsAppWebhookVerificationQuery(req.query);

    if (mode === 'subscribe' && token === verifyToken && challenge)
      return challenge;

    if (!mode && !token && !challenge) {
      this.logger.debug('Ignoring non-verification WhatsApp webhook GET');
      return 'OK';
    }

    throw new ForbiddenException('Verification failed');
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(WhatsAppWebhookAckResponseDto)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: HandleWhatsAppWebhookDto,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !signature)
      throw new UnauthorizedException('Missing webhook signature');

    const verification = await this.webhookVerifier.verify({
      provider: 'meta-whatsapp',
      rawBody,
      signature,
      secret: this.configService.getMetaConfig().appSecret,
      signaturePrefix: 'sha256=',
    });

    if (!verification.ok) {
      this.logger.warn('WhatsApp webhook verification failed', {
        failure: verification.failure,
      });
      if (verification.failure === 'replayed')
        throw new ConflictException('Webhook already processed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const entryCount = payload.entry?.length ?? 0;
    this.logger.debug(`Received WhatsApp webhook with ${entryCount} entries`);
    await this.handleWebhookUseCase.execute({ payload });
    return { status: 'ok' };
  }
}
