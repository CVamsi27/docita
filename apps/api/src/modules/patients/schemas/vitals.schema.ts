import { z } from 'zod';

export const VitalSignSchema = z.object({
  height: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  bmi: z.number().min(0).optional(),
  bloodPressure: z
    .string()
    .regex(/^\d{2,3}\/\d{2,3}$/, 'Invalid BP format (e.g., 120/80)')
    .optional(),
  pulse: z.number().int().min(0).max(300).optional(),
  respiratoryRate: z.number().int().min(0).max(100).optional(),
  temperature: z.number().min(30).max(45).optional(), // Celsius assumed, broad range
  spo2: z.number().min(0).max(100).optional(),
  painScore: z.number().min(0).max(10).optional(),
  bloodGlucose: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type VitalSignInput = z.input<typeof VitalSignSchema>;
