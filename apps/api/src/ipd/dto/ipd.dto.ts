import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// IPD DTOs

export const CreateWardSchema = z.object({
  name: z.string().min(1),
  type: z.string(), // e.g. "General", "ICU", etc.
  description: z.string().optional(),
  floorNumber: z.number().int().optional(),
});
export class CreateWardDto extends createZodDto(CreateWardSchema) {}

export const CreateRoomSchema = z.object({
  wardId: z.string().uuid().or(z.string()),
  roomNumber: z.string(),
  type: z.string().optional(),
  pricePerDay: z.number().nonnegative().optional(),
  features: z.array(z.string()).optional(),
});
export class CreateRoomDto extends createZodDto(CreateRoomSchema) {}

// BedStatus is likely a union type, so we define the enum values manually for Zod
const BedStatusEnum = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'CLEANING',
  'RESERVED',
]);

export const CreateBedSchema = z.object({
  roomId: z.string().uuid().or(z.string()),
  bedNumber: z.string(),
  type: z.string().optional(),
  priceOverride: z.number().nonnegative().optional(),
  status: BedStatusEnum.optional(),
});
export class CreateBedDto extends createZodDto(CreateBedSchema) {}

export const UpdateBedStatusSchema = z.object({
  status: BedStatusEnum,
});
export class UpdateBedStatusDto extends createZodDto(UpdateBedStatusSchema) {}

export const AdmitPatientSchema = z.object({
  patientId: z.string(),
  bedId: z.string(),
  doctorId: z.string(),
  diagnosis: z.string().optional(),
  admissionDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  estimatedDischargeDate: z.coerce.date().optional(),
});
export class AdmitPatientDto extends createZodDto(AdmitPatientSchema) {}
