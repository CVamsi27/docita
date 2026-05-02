import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ClinicTier, ClinicType } from '@workspace/db';
import {
  createClinicRequestSchema,
  updateClinicRequestSchema,
  updateClinicSettingsRequestSchema,
  clinicResponseSchema,
  listClinicsResponseSchema,
  createClinicDoctorRequestSchema,
  createClinicMemberRequestSchema,
  createClinicReceptionistRequestSchema,
  updateClinicMemberRequestSchema,
} from '@workspace/types';

export const CreateClinicSchema = createClinicRequestSchema.extend({
  tier: z.nativeEnum(ClinicTier).optional(),
  type: z.nativeEnum(ClinicType).optional(),
});

export class CreateClinicDto extends createZodDto(CreateClinicSchema) {}

export const UpdateClinicSchema = updateClinicRequestSchema.extend({
  tier: z.nativeEnum(ClinicTier).optional(),
  type: z.nativeEnum(ClinicType).optional(),
});

export class UpdateClinicDto extends createZodDto(UpdateClinicSchema) {}

export const ClinicSettingsUpdateSchema = updateClinicSettingsRequestSchema;

export class ClinicSettingsDto extends createZodDto(
  ClinicSettingsUpdateSchema,
) {}

export const clinicSchema = clinicResponseSchema;

export class ClinicResponseDto extends createZodDto(clinicSchema) {}

export class ClinicListResponseDto extends createZodDto(
  listClinicsResponseSchema,
) {}

export const CreateDoctorSchema = createClinicDoctorRequestSchema;

export class ClinicCreateDoctorDto extends createZodDto(CreateDoctorSchema) {}

export class ClinicCreateReceptionistDto extends createZodDto(
  createClinicReceptionistRequestSchema,
) {}

export const CreateClinicMemberSchema = createClinicMemberRequestSchema;

export class ClinicCreateMemberDto extends createZodDto(
  CreateClinicMemberSchema,
) {}

export const UpdateMemberSchema = updateClinicMemberRequestSchema;

export class ClinicUpdateMemberDto extends createZodDto(UpdateMemberSchema) {}

export const JoinClinicSchema = z
  .object({
    clinicCode: z.string().trim().min(3).optional(),
    clinicEmail: z.string().trim().email().optional(),
  })
  .refine((data) => Boolean(data.clinicCode || data.clinicEmail), {
    message: 'clinicCode or clinicEmail is required',
  });

export class JoinClinicDto extends createZodDto(JoinClinicSchema) {}
