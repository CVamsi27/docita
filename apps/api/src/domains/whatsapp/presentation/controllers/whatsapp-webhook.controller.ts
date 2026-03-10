import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  HandleWhatsAppWebhookDto,
  VerifyWhatsAppWebhookQueryDto,
  WhatsAppWebhookAckResponseDto,
} from '@/domains/whatsapp/application/dto/whatsapp.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Get()
  verifyWebhook(@Query() query: VerifyWhatsAppWebhookQueryDto) {
    const verifyToken = this.configService.getMetaConfig().verifyToken;
    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === verifyToken
    ) {
      return query['hub.challenge'];
    }
    return 'Verification failed';
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(WhatsAppWebhookAckResponseDto)
  async handleWebhook(@Body() payload: HandleWhatsAppWebhookDto) {
    this.logger.debug('Received WhatsApp webhook', payload);
    await this.handleWebhookUseCase.execute({ payload });
    return { status: 'ok' };
  }
}
