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
  clinicWhatsappCampaignCancelResponseSchema,
  clinicWhatsappCampaignListResponseSchema,
  clinicWhatsappCampaignPreviewRequestSchema,
  clinicWhatsappCampaignPreviewResponseSchema,
  clinicWhatsappCampaignSummarySchema,
  clinicWhatsappConversationListResponseSchema,
  clinicWhatsappConversationMessageListResponseSchema,
  clinicWhatsappConversationReadResponseSchema,
  clinicWhatsappConversationReplyRequestSchema,
  createClinicWhatsappCampaignRequestSchema,
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

export class ClinicWhatsappConversationListResponseDto extends createZodDto(
  clinicWhatsappConversationListResponseSchema,
) {}
export class ClinicWhatsappConversationMessageListResponseDto extends createZodDto(
  clinicWhatsappConversationMessageListResponseSchema,
) {}
export class ClinicWhatsappConversationReplyDto extends createZodDto(
  clinicWhatsappConversationReplyRequestSchema,
) {}
export class ClinicWhatsappConversationReadResponseDto extends createZodDto(
  clinicWhatsappConversationReadResponseSchema,
) {}
export class ClinicWhatsappCampaignPreviewDto extends createZodDto(
  clinicWhatsappCampaignPreviewRequestSchema,
) {}
export class ClinicWhatsappCampaignPreviewResponseDto extends createZodDto(
  clinicWhatsappCampaignPreviewResponseSchema,
) {}
export class CreateClinicWhatsappCampaignDto extends createZodDto(
  createClinicWhatsappCampaignRequestSchema,
) {}
export class ClinicWhatsappCampaignSummaryDto extends createZodDto(
  clinicWhatsappCampaignSummarySchema,
) {}
export class ClinicWhatsappCampaignListResponseDto extends createZodDto(
  clinicWhatsappCampaignListResponseSchema,
) {}
export class ClinicWhatsappCampaignCancelResponseDto extends createZodDto(
  clinicWhatsappCampaignCancelResponseSchema,
) {}
