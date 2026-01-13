import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Specialization, HospitalRole } from '@workspace/db';
import { userSchema } from '@workspace/types';

export const CreateDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.string().optional(),
  specialization: z.nativeEnum(Specialization).optional(),
  hospitalRole: z.nativeEnum(HospitalRole).optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().int().nonnegative().optional(),
  consultationFee: z.number().nonnegative().optional(),
});
export class CreateDoctorDto extends createZodDto(CreateDoctorSchema) {}

export const UpdateDoctorSchema = CreateDoctorSchema.partial()
  .omit({ email: true, password: true })
  .extend({
    email: z.string().email().optional(), // Allow email update?
    licenseExpiry: z.coerce.date().optional(),
    signatureUrl: z.string().url().optional(),
    profilePhotoUrl: z.string().url().optional(),
  });
export class UpdateDoctorDto extends createZodDto(UpdateDoctorSchema) {}

export const CreateEducationSchema = z.object({
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  institution: z.string(),
  location: z.string().optional(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  isOngoing: z.boolean().optional(),
  grade: z.string().optional(),
  thesis: z.string().optional(),
  order: z.number().int().optional(),
});
export class CreateEducationDto extends createZodDto(CreateEducationSchema) {}

export const CreateCertificationSchema = z.object({
  name: z.string(),
  issuingBody: z.string(),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
});
export class CreateCertificationDto extends createZodDto(
  CreateCertificationSchema,
) {}

export const AddSpecializationSchema = z.object({
  specialization: z.nativeEnum(Specialization),
  yearsOfPractice: z.number().int().optional(),
});
export class AddSpecializationDto extends createZodDto(
  AddSpecializationSchema,
) {}

export class DoctorResponseDto extends createZodDto(userSchema) {}

export class DoctorListResponseDto extends createZodDto(z.array(userSchema)) {}
