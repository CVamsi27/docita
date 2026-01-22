import { z } from 'zod';

export const LabTestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  code: z.string().optional(),
  price: z.number().min(0).optional(),
  description: z.string().optional(),
  clinicId: z.string().min(1, 'Clinic ID is required'),
});

export const CreateLabOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  labTestId: z.string().min(1, 'Lab Test ID is required'),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateLabOrderSchema = z.object({
  status: z.string().optional(),
  result: z.record(z.unknown()).optional(),
  resultUrl: z.string().optional(),
  notes: z.string().optional(),
});

export type LabTestInput = z.infer<typeof LabTestSchema>;
export type CreateLabOrderInput = z.infer<typeof CreateLabOrderSchema>;
export type UpdateLabOrderInput = z.infer<typeof UpdateLabOrderSchema>;
