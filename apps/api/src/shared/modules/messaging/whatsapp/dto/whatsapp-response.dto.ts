import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  whatsappTemplateSchema,
  whatsappMessageResponseSchema,
  whatsappLogSchema,
  whatsappStatsSchema,
} from '@workspace/types';

export class WhatsappTemplateListResponseDto extends createZodDto(
  z.object({ data: z.array(whatsappTemplateSchema) }),
) {}
export class WhatsappDefaultTemplatesResponseDto extends createZodDto(
  z.array(z.string()),
) {}
export class WhatsappMessageResponseDto extends createZodDto(
  whatsappMessageResponseSchema,
) {}
export class WhatsappLogListResponseDto extends createZodDto(
  z.array(whatsappLogSchema),
) {}
export class WhatsappStatsResponseDto extends createZodDto(
  whatsappStatsSchema,
) {}

export class WhatsappUnreadCountResponseDto extends createZodDto(
  z.object({ count: z.number().int().min(0) }),
) {}

export class WhatsappUnreadNotificationsResponseDto extends createZodDto(
  z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      message: z.string(),
      data: z.unknown(),
      priority: z.string(),
      createdAt: z.date().or(z.string()),
    }),
  ),
) {}

export const markNotificationsReadRequestSchema = z.object({
  notificationIds: z.array(z.string()).min(1),
});

export class MarkNotificationsReadRequestDto extends createZodDto(
  markNotificationsReadRequestSchema,
) {}

export class SuccessResponseDto extends createZodDto(
  z.object({ success: z.boolean(), message: z.string().optional() }),
) {}
