import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  HandleWhatsAppWebhookDto,
  WhatsAppWebhookAckResponseDto,
} from '@/domains/whatsapp/application/dto/whatsapp.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { type WhatsAppWebhookVerifyQuery } from '@workspace/types';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
    private readonly configService: AppConfigService,
  ) {}

  private verifyMetaSignature(rawBody: Buffer, signature: string): boolean {
    const appSecret = this.configService.getMetaConfig().appSecret;
    if (!appSecret) {
      this.logger.warn(
        'META_APP_SECRET not configured — rejecting WhatsApp webhook',
      );
      return false;
    }

    const expected =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    if (expected.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  }

  @Public()
  @Get()
  verifyWebhook(@Query() query: WhatsAppWebhookVerifyQuery = {}) {
    const verifyToken = this.configService.getMetaConfig().verifyToken;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      return challenge;
    }

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
    if (!rawBody || !signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    if (!this.verifyMetaSignature(rawBody, signature)) {
      this.logger.warn('WhatsApp webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const entryCount = payload.entry?.length ?? 0;
    this.logger.debug(`Received WhatsApp webhook with ${entryCount} entries`);
    await this.handleWebhookUseCase.execute({ payload });
    return { status: 'ok' };
  }
}
