import { z } from 'zod';

export const RazorpayWebhookSchema = z.object({
  id: z.string(),
  entity: z.string(),
  event: z.string(),
  contains: z.array(z.string()).optional(),
  payload: z.record(z.any()).optional(),
  created_at: z.number().optional(),
});

export class RazorpayWebhookDto {
  id: string;
  entity: string;
  event: string;
  contains?: string[];
  payload?: Record<string, any>;
  created_at?: number;
}
