import { z } from "zod";

export const medicationDataSchema = z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
});

export const prescriptionTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    userId: z.string(),
    medications: z.array(medicationDataSchema),
    instructions: z.string().nullable().optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export type PrescriptionTemplate = z.infer<typeof prescriptionTemplateSchema>;
export type MedicationData = z.infer<typeof medicationDataSchema>;
