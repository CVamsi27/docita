import { createZodDto } from 'nestjs-zod';
import { supportWhatsAppMessageListResponseSchema } from '@workspace/types';
import { z } from 'zod';

export const supportWhatsAppMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export class SupportWhatsAppMessagesQueryDto extends createZodDto(
  supportWhatsAppMessagesQuerySchema,
) {}

export class SupportWhatsAppMessageListResponseDto extends createZodDto(
  supportWhatsAppMessageListResponseSchema,
) {}
