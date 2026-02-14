import { z } from "zod";

/**
 * IPD (In-Patient Department) Types
 * =====================================================
 * Types for hospital bed management and patient admissions
 */

export const BedStatusEnum = z.enum([
    "AVAILABLE", "OCCUPIED", "MAINTENANCE", "CLEANING", "RESERVED"
]);
export type BedStatus = z.infer<typeof BedStatusEnum>;

export const AdmissionStatus = z.enum([
    "ADMITTED", "DISCHARGED", "TRANSFERRED"
]);

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

export type Ward = z.infer<typeof wardSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Bed = z.infer<typeof bedSchema>;
export type Admission = z.infer<typeof admissionSchema>;

/**
 * =====================================================
 * IPD DTO Types (Consolidated from ipd-types.ts)
 * =====================================================
 */

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
