import { createZodDto } from 'nestjs-zod';
import {
  supportWhatsAppMessageListResponseSchema,
  supportWhatsAppReadResponseSchema,
  supportWhatsAppReplyRequestSchema,
  supportWhatsAppReplyResponseSchema,
  supportWhatsAppThreadListResponseSchema,
} from '@workspace/types';
import { z } from 'zod';

export const supportWhatsAppThreadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const supportWhatsAppThreadMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export class SupportWhatsAppThreadsQueryDto extends createZodDto(
  supportWhatsAppThreadsQuerySchema,
) {}

export class SupportWhatsAppThreadMessagesQueryDto extends createZodDto(
  supportWhatsAppThreadMessagesQuerySchema,
) {}

export class SupportWhatsAppThreadListResponseDto extends createZodDto(
  supportWhatsAppThreadListResponseSchema,
) {}

export class SupportWhatsAppMessageListResponseDto extends createZodDto(
  supportWhatsAppMessageListResponseSchema,
) {}

export class SupportWhatsAppReplyDto extends createZodDto(
  supportWhatsAppReplyRequestSchema,
) {}

export class SupportWhatsAppReplyResponseDto extends createZodDto(
  supportWhatsAppReplyResponseSchema,
) {}

export class SupportWhatsAppReadResponseDto extends createZodDto(
  supportWhatsAppReadResponseSchema,
) {}
