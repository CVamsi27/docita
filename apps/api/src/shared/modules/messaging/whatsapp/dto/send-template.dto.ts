import { z } from 'zod';
import { sendTemplateRequestSchema } from '@workspace/types';

export const sendTemplateSchema = sendTemplateRequestSchema;

export type SendTemplateDto = z.infer<typeof sendTemplateSchema>;
