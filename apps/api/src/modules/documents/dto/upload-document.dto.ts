import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UploadDocumentSchema = z.object({
  patientId: z.string().min(1, { message: 'Patient ID is required' }),
  type: z.string().min(1, { message: 'Document type is required' }),
  description: z.string().optional(),
});

export class UploadDocumentDto extends createZodDto(UploadDocumentSchema) {}
