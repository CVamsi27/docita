import { createZodDto } from 'nestjs-zod';
import {
  successResponseSchema,
  whatsappDefaultTemplatesResponseSchema,
  whatsappLogListResponseSchema,
  whatsappLogsQuerySchema,
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
export class WhatsappDefaultTemplatesResponseDto extends createZodDto(
  whatsappDefaultTemplatesResponseSchema,
) {}
export class WhatsappMessageResponseDto extends createZodDto(
  whatsappMessageProviderResponseSchema,
) {}
export class WhatsappLogListResponseDto extends createZodDto(
  whatsappLogListResponseSchema,
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

export class WhatsappLogsQueryDto extends createZodDto(
  whatsappLogsQuerySchema,
) {}

export class WhatsappUnreadNotificationsQueryDto extends createZodDto(
  whatsappUnreadNotificationsQuerySchema,
) {}

export class SuccessResponseDto extends createZodDto(successResponseSchema) {}
