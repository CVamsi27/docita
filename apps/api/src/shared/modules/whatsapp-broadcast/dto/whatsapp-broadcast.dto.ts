import { createZodDto } from 'nestjs-zod';
import {
  createWhatsAppBroadcastJobRequestSchema,
  whatsappBroadcastJobDetailSchema,
  whatsappBroadcastJobListResponseSchema,
  whatsappBroadcastJobSummarySchema,
} from '@workspace/types';

export class CreateWhatsAppBroadcastDto extends createZodDto(
  createWhatsAppBroadcastJobRequestSchema,
) {}

export class WhatsAppBroadcastJobSummaryDto extends createZodDto(
  whatsappBroadcastJobSummarySchema,
) {}

export class WhatsAppBroadcastJobDetailDto extends createZodDto(
  whatsappBroadcastJobDetailSchema,
) {}

export class WhatsAppBroadcastJobListResponseDto extends createZodDto(
  whatsappBroadcastJobListResponseSchema,
) {}
