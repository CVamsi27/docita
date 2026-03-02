import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Specialization, HospitalRole } from '@workspace/db';
import {
  createDoctorRequestSchema,
  updateDoctorRequestSchema,
  doctorResponseSchema,
  doctorListResponseSchema,
} from '@workspace/types';

export const CreateDoctorSchema = createDoctorRequestSchema.extend({
  specialization: z.nativeEnum(Specialization).optional(),
  hospitalRole: z.nativeEnum(HospitalRole).optional(),
});
export class CreateDoctorDto extends createZodDto(CreateDoctorSchema) {}

export const UpdateDoctorSchema = updateDoctorRequestSchema.extend({
  specialization: z.nativeEnum(Specialization).optional(),
  hospitalRole: z.nativeEnum(HospitalRole).optional(),
  licenseExpiry: z.coerce.date().optional(),
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

export class DoctorResponseDto extends createZodDto(doctorResponseSchema) {}

export class DoctorListResponseDto extends createZodDto(
  doctorListResponseSchema,
) {}
