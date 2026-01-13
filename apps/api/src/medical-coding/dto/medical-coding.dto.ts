import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  icdCodeSchema,
  cptCodeSchema,
  doctorFavoriteCodeSchema,
} from '@workspace/types';

export const AddFavoriteSchema = z.object({
  icdCodeId: z.string(),
});
export class AddFavoriteDto extends createZodDto(AddFavoriteSchema) {}

export const AddCptFavoriteSchema = z.object({
  cptCodeId: z.string(),
});
export class AddCptFavoriteDto extends createZodDto(AddCptFavoriteSchema) {}

// Response DTOs
export class IcdCodeResponseDto extends createZodDto(icdCodeSchema) {}
export class IcdCodeListResponseDto extends createZodDto(
  z.array(icdCodeSchema),
) {}

export class CptCodeResponseDto extends createZodDto(cptCodeSchema) {}
export class CptCodeListResponseDto extends createZodDto(
  z.array(cptCodeSchema),
) {}

export class DoctorFavoriteCodeResponseDto extends createZodDto(
  doctorFavoriteCodeSchema,
) {}
export class DoctorFavoriteCodeListResponseDto extends createZodDto(
  z.array(doctorFavoriteCodeSchema),
) {}

// Uncoded visits response schema
// This returns Appointment with selected fields.
// We can define a simplified schema or reuse partial appointment schema if available, but it's cleaner to define what is actually returned.
export const UncodedVisitSchema = z.object({
  id: z.string(),
  startTime: z.date().or(z.string()),
  status: z.string(),
  patient: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  doctor: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export class UncodedVisitResponseDto extends createZodDto(UncodedVisitSchema) {}
export class UncodedVisitListResponseDto extends createZodDto(
  z.array(UncodedVisitSchema),
) {}
