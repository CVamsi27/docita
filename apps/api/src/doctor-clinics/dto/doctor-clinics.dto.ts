import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DoctorClinicSchema } from '@workspace/types';

export const AssignDoctorSchema = z.object({
  doctorId: z.string(),
  clinicId: z.string(),
  role: z.string().optional(),
});
export class AssignDoctorDto extends createZodDto(AssignDoctorSchema) {}

export const RemoveDoctorSchema = z.object({
  doctorId: z.string(),
  clinicId: z.string(),
});
export class RemoveDoctorDto extends createZodDto(RemoveDoctorSchema) {}

export const UpdateRoleSchema = z.object({
  doctorId: z.string(),
  clinicId: z.string(),
  role: z.string(),
});
export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {}

export class DoctorClinicResponseDto extends createZodDto(DoctorClinicSchema) {}
export class DoctorClinicListResponseDto extends createZodDto(
  z.array(DoctorClinicSchema),
) {}
