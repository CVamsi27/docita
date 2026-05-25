import { z } from 'zod';

export const MedicalDocumentTypeSchema = z.enum([
  'MEDICAL_CERTIFICATE',
  'FITNESS_CERTIFICATE',
  'DISCHARGE_SUMMARY',
  'REFERRAL_LETTER',
  'SICK_NOTE',
  'OTHER',
]);

export const MedicalDocumentStatusSchema = z.enum(['DRAFT', 'SIGNED', 'REVOKED']);

/** Prisma `MedicalDocument.content`. */
export const medicalDocumentContentJsonSchema = z.record(z.unknown());

export const MedicalDocumentSchema = z.object({
  id: z.string(),
  type: MedicalDocumentTypeSchema,
  patientId: z.string(),
  doctorId: z.string(),
  clinicId: z.string(),
  appointmentId: z.string().nullable().optional(),
  title: z.string(),
  content: medicalDocumentContentJsonSchema,
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  status: MedicalDocumentStatusSchema,
  signedAt: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateMedicalDocumentSchema = MedicalDocumentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  signedAt: true,
  pdfUrl: true,
  status: true,
}).extend({
  patientId: z.string(),
  clinicId: z.string(),
  doctorId: z.string(),
});

export const UpdateMedicalDocumentSchema = CreateMedicalDocumentSchema.partial();

export type MedicalDocument = z.infer<typeof MedicalDocumentSchema>;
export type CreateMedicalDocument = z.infer<typeof CreateMedicalDocumentSchema>;
export type UpdateMedicalDocument = z.infer<typeof UpdateMedicalDocumentSchema>;
