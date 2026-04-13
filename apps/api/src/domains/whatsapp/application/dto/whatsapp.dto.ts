import { createZodDto } from 'nestjs-zod';
import {
  sendWhatsAppMessageRequestSchema,
  whatsappSendMessageResponseSchema,
  whatsappWebhookAckResponseSchema,
  whatsappWebhookPayloadSchema,
} from '@workspace/types';

export class SendWhatsAppMessageDto extends createZodDto(
  sendWhatsAppMessageRequestSchema,
) {}

export class SendWhatsAppMessageResponseDto extends createZodDto(
  whatsappSendMessageResponseSchema,
) {}

export class HandleWhatsAppWebhookDto extends createZodDto(
  whatsappWebhookPayloadSchema,
) {}

export class WhatsAppWebhookAckResponseDto extends createZodDto(
  whatsappWebhookAckResponseSchema,
) {}
