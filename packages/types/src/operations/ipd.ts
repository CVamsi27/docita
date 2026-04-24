import { z } from "zod";

export const BedStatusEnum = z.enum([
  "AVAILABLE",
  "OCCUPIED",
  "MAINTENANCE",
  "CLEANING",
  "RESERVED",
]);
export type BedStatus = z.infer<typeof BedStatusEnum>;

export const AdmissionStatus = z.enum([
  "ADMITTED",
  "DISCHARGED",
  "TRANSFERRED",
]);
export type AdmissionStatusType = z.infer<typeof AdmissionStatus>;

export const wardSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable().optional(),
  floorNumber: z.string().nullable().optional(),
  clinicId: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const roomSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  roomNumber: z.string(),
  type: z.string().nullable().optional(),
  charges: z.number(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const bedSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  bedNumber: z.string(),
  status: z.string().or(BedStatusEnum),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const admissionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  bedId: z.string(),
  admittedAt: z.date().or(z.string()),
  dischargedAt: z.date().or(z.string()).nullable().optional(),
  status: z.string().or(AdmissionStatus),
  reason: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  admittingDoctorId: z.string().nullable().optional(),
});

export const transferSchema = z.object({
  id: z.string(),
  admissionId: z.string(),
  fromBedId: z.string(),
  toBedId: z.string(),
  reason: z.string().nullable().optional(),
  transferredAt: z.date().or(z.string()),
  transferredById: z.string().nullable().optional(),
});

export const inpatientCensusSchema = z.object({
  totalBeds: z.number().int().nonnegative(),
  occupiedBeds: z.number().int().nonnegative(),
  availableBeds: z.number().int().nonnegative(),
  maintenanceBeds: z.number().int().nonnegative().optional(),
  occupancyRate: z.number().min(0).max(100),
  admissionsToday: z.number().int().nonnegative().optional(),
  dischargesToday: z.number().int().nonnegative().optional(),
  transfersToday: z.number().int().nonnegative().optional(),
});

export type Ward = z.infer<typeof wardSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Bed = z.infer<typeof bedSchema>;
export type Admission = z.infer<typeof admissionSchema>;
export type Transfer = z.infer<typeof transferSchema>;
export type InpatientCensus = z.infer<typeof inpatientCensusSchema>;

export const admitPatientRequestSchema = z.object({
  patientId: z.string().min(1),
  bedId: z.string().min(1),
  admittingDoctorId: z.string().min(1),
  admissionDate: z.string().or(z.date()).optional(),
  admissionReason: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1),
      phone: z.string().min(1),
      relation: z.string().min(1),
    })
    .optional(),
});

export const transferPatientRequestSchema = z.object({
  admissionId: z.string().min(1),
  toBedId: z.string().min(1),
  reason: z.string().min(3).optional(),
});

export const dischargePatientRequestSchema = z.object({
  admissionId: z.string().min(1),
  dischargeDate: z.string().or(z.date()).optional(),
  dischargeSummary: z.string().min(3).optional(),
  dischargeInstructions: z.string().optional(),
  followUpDate: z.string().or(z.date()).optional(),
});

export type AdmitPatientRequest = z.infer<typeof admitPatientRequestSchema>;
export type TransferPatientRequest = z.infer<
  typeof transferPatientRequestSchema
>;
export type DischargePatientRequest = z.infer<
  typeof dischargePatientRequestSchema
>;

export interface CreateWardDto {
  name: string;
  capacity: number;
  clinicId: string;
  description?: string;
  floor?: string;
}

export interface CreateRoomDto {
  wardId: string;
  roomNumber: string;
  roomType?: "GENERAL" | "PRIVATE" | "ICU" | "SEMI_PRIVATE";
  capacity?: number;
}

export interface CreateBedDto {
  roomId: string;
  bedNumber: string;
  bedType?: "STANDARD" | "ICU" | "VENTILATOR";
}

export interface UpdateBedStatusDto {
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
}

export interface AdmitPatientDto {
  patientId: string;
  bedId: string;
  admittingDoctorId: string;
  admissionDate?: Date;
  admissionReason?: string;
  expectedDischargeDate?: Date;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
}

export interface DischargePatientDto {
  dischargeDate?: Date;
  dischargeSummary?: string;
  dischargeInstructions?: string;
  followUpDate?: Date;
}
