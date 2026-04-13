import { z } from 'zod';

export const pdfJobStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const enqueuePdfJobResponseSchema = z.object({
  jobId: z.string(),
  status: pdfJobStatusSchema,
  pollUrl: z.string(),
});

export const pdfJobStatusResponseSchema = z.object({
  jobId: z.string(),
  status: pdfJobStatusSchema,
  pdfUrl: z.string().url().optional(),
  createdAt: z.coerce.date(),
});

export type PdfJobStatus = z.infer<typeof pdfJobStatusSchema>;
export type EnqueuePdfJobResponse = z.infer<typeof enqueuePdfJobResponseSchema>;
export type PdfJobStatusResponse = z.infer<typeof pdfJobStatusResponseSchema>;
