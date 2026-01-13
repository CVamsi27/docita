import { z } from "zod";

export const aiMedicationSchema = z.object({
    name: z.string(),
    dosage: z.string(),
});

export const aiPrescriptionAnalysisInputSchema = z.object({
    medications: z.array(aiMedicationSchema),
    patientAge: z.number().optional(),
    patientAllergies: z.array(z.string()).optional(),
    existingConditions: z.array(z.string()).optional(),
});

export const aiAnalysisResultSchema = z.object({
    interactions: z.array(z.object({
        severity: z.string(),
        description: z.string(),
        medications: z.array(z.string()),
    })),
    contraindications: z.array(z.object({
        condition: z.string(),
        medication: z.string(),
        reason: z.string(),
    })),
    suggestions: z.array(z.string()),
});

export const aiDiagnosisSuggestionSchema = z.object({
    condition: z.string(),
    probability: z.number(), // 0-1
    reasoning: z.string().optional(),
    recommendedTests: z.array(z.string()).optional(),
});

export const aiMedicationRecommendationSchema = z.object({
    name: z.string(),
    dosage: z.string().optional(),
    reason: z.string().optional(),
    warnings: z.array(z.string()).optional(),
});

export const aiExtractionResultSchema = z.object({
    patientName: z.string().optional(),
    date: z.string().optional(),
    medications: z.array(aiMedicationSchema).optional(),
    diagnoses: z.array(z.string()).optional(),
    rawText: z.string().optional(),
});
