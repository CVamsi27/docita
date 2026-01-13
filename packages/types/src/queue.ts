import { z } from "zod";
import { patientSchema } from "./index";

export const queueSettingsSchema = z.object({
    queueBufferMinutes: z.number(),
    useDoctorQueues: z.boolean(),
    lateArrivalGraceMinutes: z.number(),
    avgConsultationMinutes: z.number(),
});

export const queueTokenSchema = z.object({
    id: z.string(),
    clinicId: z.string(),
    patientId: z.string(),
    doctorId: z.string().nullable().optional(),
    appointmentId: z.string().nullable().optional(),
    tokenNumber: z.number(),
    status: z.string(),
    priority: z.number(),
    notes: z.string().nullable().optional(),
    tokenType: z.string(),
    scheduledTime: z.date().or(z.string()).nullable().optional(),
    estimatedDuration: z.number(),
    estimatedWaitTime: z.number().nullable().optional(),
    consultationStart: z.date().or(z.string()).nullable().optional(),
    consultationEnd: z.date().or(z.string()).nullable().optional(),
    calledAt: z.date().or(z.string()).nullable().optional(),
    completedAt: z.date().or(z.string()).nullable().optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),

    // Relations often returned
    patient: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        phoneNumber: z.string(),
        gender: z.string().optional(),
        dateOfBirth: z.date().or(z.string()).optional(),
    }).optional(),
    doctor: z.object({
        id: z.string(),
        name: z.string(),
    }).nullable().optional(),
    appointment: z.object({
        id: z.string(),
        startTime: z.date().or(z.string()),
        type: z.string(),
        endTime: z.date().or(z.string()).optional(),
        status: z.string().optional(),
    }).nullable().optional(),
});

export type QueueToken = z.infer<typeof queueTokenSchema>;
export type QueueSettings = z.infer<typeof queueSettingsSchema>;
