import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  hospitalRoleSchema,
  specializationSchema,
  prescriptionSchema,
} from '@workspace/types';

// Define Medication Schema manually or loosely if exact types aren't available immediately
// Assuming standard fields based on typical medical apps
const MedicationSchema = z
  .object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
    quantity: z.number().optional(),
    route: z.string().optional(),
  })
  .passthrough(); // Allow extra fields defined in the shared type

export const CreatePrescriptionSchema = z.object({
  appointmentId: z.string().uuid(), // Made required based on service error
  patientId: z.string(),
  doctorId: z.string(),
  instructions: z.string().optional(),
  medications: z.array(MedicationSchema),
  // Doctor context
  doctorName: z.string().optional(),
  doctorEmail: z.string().email().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: specializationSchema.optional(),
  doctorRole: hospitalRoleSchema.optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
});

export class CreatePrescriptionDto extends createZodDto(
  CreatePrescriptionSchema,
) {}

export class PrescriptionResponseDto extends createZodDto(prescriptionSchema) {}

export class PrescriptionListResponseDto extends createZodDto(
  z.array(prescriptionSchema),
) {}
