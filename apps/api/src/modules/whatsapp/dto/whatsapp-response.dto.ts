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

export class SuccessResponseDto extends createZodDto(
  z.object({ success: z.boolean(), message: z.string().optional() }),
) {}
