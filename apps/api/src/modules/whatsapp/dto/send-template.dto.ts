import { z } from 'zod';

export const sendTemplateSchema = z.object({
  templateId: z.string(),
  phoneNumber: z.string(),
  variables: z.record(z.string()),
  patientId: z.string().optional(),
  appointmentId: z.string().optional(),
  prescriptionId: z.string().optional(),
  invoiceId: z.string().optional(),
});

export type SendTemplateDto = z.infer<typeof sendTemplateSchema>;
