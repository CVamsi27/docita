import { z } from "zod";

export const DosageForm = z.enum([
    "TABLET", "CAPSULE", "SOLUTION", "SUSPENSION", "INJECTION", "CREAM", "OINTMENT",
    "GEL", "PATCH", "INHALER", "NEBULIZER", "SUPPOSITORY", "DROPS", "SPRAY",
    "POWDER", "LOZENGE", "FILM", "OTHER"
]);

export const SigCode = z.enum([
    "QD", "BID", "TID", "QID", "Q4H", "Q6H", "Q8H", "Q12H", "QHS",
    "QAM", "QPM", "QOD", "QWK", "PRN", "STAT", "AC"
]);

export const medicationSchema = z.object({
    id: z.string(),
    prescriptionId: z.string(),
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    route: z.string(),
    ndcCode: z.string().nullable().optional(),
    rxNormCui: z.string().nullable().optional(),
    dosageForm: z.string().or(DosageForm).nullable().optional(),
    strengthValue: z.number().nullable().optional(),
    strengthUnit: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    refillsAllowed: z.number().nullable().optional(),
    dispenseAsWritten: z.boolean(),
    sigCode: z.string().or(SigCode).nullable().optional(),
});

export type Medication = z.infer<typeof medicationSchema>;

// Validation Schemas for MedicationValidationController
export const checkDrugInteractionsSchema = z.object({
    medications: z.array(z.object({
        name: z.string(),
        dosage: z.string().optional()
    })),
    patientAllergies: z.array(z.string()).optional()
});

export const validateDosageSchema = z.object({
    medication: z.string(),
    dosage: z.string()
});

export const checkContraindicationsSchema = z.object({
    medication: z.string(),
    patientAllergies: z.array(z.object({
        name: z.string(),
        severity: z.string() // Assuming severity is string based on controller usage
    })).optional(),
    patientConditions: z.array(z.object({
        icdCode: z.string(),
        name: z.string()
    })).optional(),
    currentMedications: z.array(z.string()).optional(),
    isPregnant: z.boolean().optional(),
    renalFunctionCategory: z.string().optional()
});

export const validatePediatricDosageSchema = z.object({
    medication: z.string(),
    dosage: z.string(),
    weightKg: z.number()
});

export const validateRenalDosageSchema = z.object({
    medication: z.string(),
    dosage: z.string(),
    renalFunctionCategory: z.string()
});

export const comprehensiveMedicationCheckSchema = z.object({
    medications: z.array(z.object({
        name: z.string(),
        dosage: z.string()
    })),
    patientAllergies: z.array(z.string()).optional(),
    patientConditions: z.array(z.string()).optional(),
    currentMedications: z.array(z.string()).optional(),
    isPregnant: z.boolean().optional(),
    age: z.number().optional(),
    weight: z.number().optional(),
    renalFunction: z.string().optional()
});
