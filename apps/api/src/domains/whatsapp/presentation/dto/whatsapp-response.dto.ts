import { createZodDto } from 'nestjs-zod';
import {
  clinicWhatsappSentMessageListResponseSchema,
  clinicWhatsappTemplateListResponseSchema,
  clinicWhatsappTemplateSchema,
  createWhatsappTemplateRequestSchema,
  sendWhatsAppCustomMessageResponseSchema,
  successResponseSchema,
  updateWhatsappTemplateRequestSchema,
  whatsappDefaultTemplatesResponseSchema,
  whatsappMessageProviderResponseSchema,
  whatsappStatsDetailedResponseSchema,
  whatsappTemplateListResponseSchema,
  whatsappUnreadCountResponseSchema,
  whatsappUnreadNotificationsQuerySchema,
  whatsappUnreadNotificationsResponseSchema,
} from '@workspace/types';

export class WhatsappTemplateListResponseDto extends createZodDto(
  whatsappTemplateListResponseSchema,
) {}
export class ClinicWhatsappTemplateResponseDto extends createZodDto(
  clinicWhatsappTemplateSchema,
) {}
export class ClinicWhatsappTemplateListResponseDto extends createZodDto(
  clinicWhatsappTemplateListResponseSchema,
) {}
export class CreateWhatsappTemplateDto extends createZodDto(
  createWhatsappTemplateRequestSchema,
) {}
export class UpdateWhatsappTemplateDto extends createZodDto(
  updateWhatsappTemplateRequestSchema,
) {}
export class SendWhatsappCustomMessageResponseDto extends createZodDto(
  sendWhatsAppCustomMessageResponseSchema,
) {}
export class WhatsappDefaultTemplatesResponseDto extends createZodDto(
  whatsappDefaultTemplatesResponseSchema,
) {}
export class WhatsappMessageResponseDto extends createZodDto(
  whatsappMessageProviderResponseSchema,
) {}
export class WhatsappStatsResponseDto extends createZodDto(
  whatsappStatsDetailedResponseSchema,
) {}

export class WhatsappUnreadCountResponseDto extends createZodDto(
  whatsappUnreadCountResponseSchema,
) {}

export class WhatsappUnreadNotificationsResponseDto extends createZodDto(
  whatsappUnreadNotificationsResponseSchema,
) {}

export class WhatsappUnreadNotificationsQueryDto extends createZodDto(
  whatsappUnreadNotificationsQuerySchema,
) {}

export class SuccessResponseDto extends createZodDto(successResponseSchema) {}

export class ClinicWhatsappSentMessageListResponseDto extends createZodDto(
  clinicWhatsappSentMessageListResponseSchema,
) {}
