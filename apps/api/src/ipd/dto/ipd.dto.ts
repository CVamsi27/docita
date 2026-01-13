import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  wardSchema,
  roomSchema,
  bedSchema,
  admissionSchema,
  BedStatusEnum,
} from '@workspace/types';

export const CreateWardSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  floorNumber: z.string().optional(),
});

export class CreateWardDto extends createZodDto(CreateWardSchema) {}

export const CreateRoomSchema = z.object({
  wardId: z.string(),
  roomNumber: z.string(),
  type: z.string().optional(),
  charges: z.number().min(0),
});

export class CreateRoomDto extends createZodDto(CreateRoomSchema) {}

export const CreateBedSchema = z.object({
  roomId: z.string(),
  bedNumber: z.string(),
});

export class CreateBedDto extends createZodDto(CreateBedSchema) {}

export const UpdateBedStatusSchema = z.object({
  status: z.string().or(BedStatusEnum),
});

export class UpdateBedStatusDto extends createZodDto(UpdateBedStatusSchema) {}

export const AdmitPatientSchema = z.object({
  patientId: z.string(),
  bedId: z.string(),
  reason: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  admittingDoctorId: z.string().optional(),
});

export class AdmitPatientDto extends createZodDto(AdmitPatientSchema) {}

// Response DTOs
export class WardResponseDto extends createZodDto(wardSchema) {}
export class WardListResponseDto extends createZodDto(z.array(wardSchema)) {}
export class RoomResponseDto extends createZodDto(roomSchema) {}
export class BedResponseDto extends createZodDto(bedSchema) {}
export class AdmissionResponseDto extends createZodDto(admissionSchema) {}
