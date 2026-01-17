import { z } from "zod";

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
