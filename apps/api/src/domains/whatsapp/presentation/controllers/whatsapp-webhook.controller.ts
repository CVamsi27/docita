import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
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
  async handleWebhook(@Body() payload: HandleWhatsAppWebhookDto) {
    const entryCount = payload.entry?.length ?? 0;
    this.logger.debug(`Received WhatsApp webhook with ${entryCount} entries`);
    await this.handleWebhookUseCase.execute({ payload });
    return { status: 'ok' };
  }
}
