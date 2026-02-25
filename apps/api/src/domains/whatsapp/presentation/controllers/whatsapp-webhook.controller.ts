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
import { Public } from '../../../../shared/modules/auth/auth/public.decorator';
import { HandleWebhookUseCase } from '../../application/use-cases/handle-webhook.use-case';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.configService.get<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return 'Verification failed';
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: Record<string, unknown>) {
    this.logger.debug('Received WhatsApp webhook', payload);
    await this.handleWebhookUseCase.execute({ payload });
    return { status: 'ok' };
  }
}
