import { z } from 'zod';

export const AdmissionSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  bedId: z.string().min(1, 'Bed ID is required'),
  admittingDoctorId: z.string().optional(),
  reason: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  admittedAt: z.date().optional(),
});

export type AdmissionInput = z.infer<typeof AdmissionSchema>;
