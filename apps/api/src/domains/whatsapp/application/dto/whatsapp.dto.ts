import { createZodDto } from 'nestjs-zod';
import {
  sendWhatsAppMessageRequestSchema,
  whatsappSendMessageResponseSchema,
  whatsappSenderConfigResponseSchema,
  whatsappWebhookAckResponseSchema,
  whatsappWebhookPayloadSchema,
  updateWhatsappSenderRequestSchema,
  verifyWhatsappSenderResponseSchema,
  revokeWhatsappSenderResponseSchema,
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

export class WhatsappSenderConfigResponseDto extends createZodDto(
  whatsappSenderConfigResponseSchema,
) {}

export class UpdateWhatsappSenderDto extends createZodDto(
  updateWhatsappSenderRequestSchema,
) {}

export class VerifyWhatsappSenderResponseDto extends createZodDto(
  verifyWhatsappSenderResponseSchema,
) {}

export class RevokeWhatsappSenderResponseDto extends createZodDto(
  revokeWhatsappSenderResponseSchema,
) {}
