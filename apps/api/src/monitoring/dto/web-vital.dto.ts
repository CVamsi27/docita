import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const webVitalSchema = z.object({
  name: z.string(), // 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP'
  value: z.number(),
  rating: z.number(), // 0-100
  page: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export class WebVitalDto extends createZodDto(webVitalSchema) {}
