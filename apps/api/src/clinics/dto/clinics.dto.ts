import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ClinicTier, ClinicType } from '@workspace/db';

// Enums from DB need to be compatible, we can match string values or use nativeEnum if imported
// Assuming ClinicTier and ClinicType can be validated as nativeEnum or strings

export const CreateClinicSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  logo: z.string().optional(),
  tier: z.nativeEnum(ClinicTier).optional(),
  type: z.nativeEnum(ClinicType).optional(),
  settings: z.any().optional(), // JSON value
});

export class CreateClinicDto extends createZodDto(CreateClinicSchema) {}

export class UpdateClinicDto extends createZodDto(
  CreateClinicSchema.partial(),
) {}

// Separate DTO for settings update which overlaps with update but has specific fields
export const ClinicSettingsSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(), // Alias or alternative field
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().int().positive().optional(),
  type: z.nativeEnum(ClinicType).optional(),
});

export class ClinicSettingsDto extends createZodDto(ClinicSettingsSchema) {}

export const CreateStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
});

export const CreateDoctorSchema = CreateStaffSchema.extend({
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
});

export class CreateDoctorDto extends createZodDto(CreateDoctorSchema) {}

export class CreateReceptionistDto extends createZodDto(CreateStaffSchema) {}
