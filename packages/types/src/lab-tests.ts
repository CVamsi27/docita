import { z } from "zod";

export const labTestSchema = z.object({
    id: z.string(),
    clinicId: z.string(),
    name: z.string(),
    code: z.string().nullable().optional(),
    loincCode: z.string().nullable().optional(),
    category: z.string(),
    price: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    referenceRangeLow: z.number().nullable().optional(),
    referenceRangeHigh: z.number().nullable().optional(),
    referenceRangeUnit: z.string().nullable().optional(),
    referenceRangeText: z.string().nullable().optional(),
    specimenType: z.string().nullable().optional(),
    collectionRequirements: z.string().nullable().optional(),
    active: z.boolean(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export const labTestOrderSchema = z.object({
    id: z.string(),
    clinicId: z.string(),
    patientId: z.string(),
    appointmentId: z.string().nullable().optional(),
    labTestId: z.string(),
    status: z.string(),
    result: z.unknown().nullable().optional(), // Json
    resultUrl: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    orderedBy: z.string(),
    collectedAt: z.date().or(z.string()).nullable().optional(),
    completedAt: z.date().or(z.string()).nullable().optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
    labTest: labTestSchema.optional(),
    doctor: z.object({ name: z.string() }).optional(),
    // We can include patient here if needed, consistent with other schemas
    patient: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
    }).optional()
});

export type LabTest = z.infer<typeof labTestSchema>;
export type LabTestOrder = z.infer<typeof labTestOrderSchema>;
