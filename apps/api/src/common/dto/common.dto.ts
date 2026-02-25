import { z } from 'zod';

export const RazorpayWebhookSchema = z.object({
  id: z.string(),
  entity: z.string(),
  event: z.string(),
  contains: z.array(z.string()).optional(),
  payload: z.record(z.unknown()).optional(),
  created_at: z.number().optional(),
});

export class RazorpayWebhookDto {
  id!: string;
  entity!: string;
  event!: string;
  contains?: string[];
  payload?: Record<string, unknown>;
  created_at?: number;
}

export const BulkImportRequestSchema = z.object({
  entityType: z.string(),
  fileName: z.string(),
  fileBuffer: z.string().or(z.instanceof(Buffer)),
});

export class BulkImportRequestDto {
  entityType!: string;
  fileName!: string;
  fileBuffer!: string | Buffer;
}
