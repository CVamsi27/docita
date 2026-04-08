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
      query['hub.verify_token'] === verifyToken &&
      query['hub.challenge']
    ) {
      return query['hub.challenge'];
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
