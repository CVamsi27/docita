import { createZodDto } from 'nestjs-zod';
import {
  internalCreateAdminRequestSchema,
  internalCreateClinicRequestSchema,
  internalUpdateAdminRequestSchema,
  internalUpdateClinicRequestSchema,
} from '@workspace/types';

export const InternalCreateClinicSchema = internalCreateClinicRequestSchema;
export class InternalCreateClinicDto extends createZodDto(
  InternalCreateClinicSchema,
) {}

export const InternalUpdateClinicSchema = internalUpdateClinicRequestSchema;
export class InternalUpdateClinicDto extends createZodDto(
  InternalUpdateClinicSchema,
) {}

export const CreateAdminSchema = internalCreateAdminRequestSchema;
export class CreateAdminDto extends createZodDto(CreateAdminSchema) {}

export const UpdateAdminSchema = internalUpdateAdminRequestSchema;
export class UpdateAdminDto extends createZodDto(UpdateAdminSchema) {}
