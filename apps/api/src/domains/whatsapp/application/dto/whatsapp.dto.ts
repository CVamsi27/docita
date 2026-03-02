import { createZodDto } from 'nestjs-zod';
import {
  sendWhatsAppMessageRequestSchema,
  whatsappSendMessageResponseSchema,
  whatsappWebhookAckResponseSchema,
  whatsappWebhookPayloadSchema,
  whatsappWebhookVerifyQuerySchema,
} from '@workspace/types';

export class SendWhatsAppMessageDto extends createZodDto(
  sendWhatsAppMessageRequestSchema,
) {}

export class SendWhatsAppMessageResponseDto extends createZodDto(
  whatsappSendMessageResponseSchema,
) {}

export class VerifyWhatsAppWebhookQueryDto extends createZodDto(
  whatsappWebhookVerifyQuerySchema,
) {}

export class HandleWhatsAppWebhookDto extends createZodDto(
  whatsappWebhookPayloadSchema,
) {}

export class WhatsAppWebhookAckResponseDto extends createZodDto(
  whatsappWebhookAckResponseSchema,
) {}
