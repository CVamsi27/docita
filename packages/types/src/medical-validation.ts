import { z } from "zod";

/**
 * Medical Validation Schemas
 * Hospital-grade validation for vital signs, dosages, and clinical parameters
 * All ranges based on standard medical references (WHO, AHA, etc.)
 */

// ============================================================================
// VITAL SIGNS VALIDATION
// ============================================================================

export interface VitalSignValidation {
  value: number;
  isValid: boolean;
  isNormal: boolean;
  message?: string;
  severity?: "warning" | "critical";
  suggestion?: string;
}

// ============================================================================
// DOSAGE VALIDATION
// ============================================================================

export interface DosageRange {
  min: number;
  max: number;
  unit: string;
  frequency: string;
  maxDaily: number;
}

export interface DosageValidation {
  dosage: string;
  medication: string;
  isValid: boolean;
  isStandard: boolean;
  message?: string;
  severity?: "info" | "warning" | "critical";
  suggestion?: string;
}

// ============================================================================
// PEDIATRIC DOSING
// ============================================================================

export interface PediatricDosageValidation extends DosageValidation {
  ageInMonths: number;
  weight: number;
  adjustedDosage?: string;
}

// ============================================================================
// RENAL/HEPATIC DOSING
// ============================================================================

export type RenalFunction = "normal" | "mild" | "moderate" | "severe" | "esrd";

export interface RenalDosageAdjustment {
  medication: string;
  originalDosage: string;
  renalFunction: RenalFunction;
  adjustedDosage?: string;
  message: string;
  requiresMonitoring: boolean;
}

// ============================================================================
// PREGNANCY CONTRAINDICATION
// ============================================================================

export type PregnancyCategory = "A" | "B" | "C" | "D" | "X";

export interface PregnancyContraindication {
  medication: string;
  category: PregnancyCategory;
  isContraindicated: boolean;
  message: string;
  alternativeMedications?: string[];
}

// ============================================================================
// ZONED SCHEMAS FOR FORM VALIDATION
// ============================================================================

export const vitalSignsInputSchema = z.object({
  bloodPressureSystolic: z
    .number()
    .min(70, "SBP too low")
    .max(200, "SBP too high")
    .optional(),
  bloodPressureDiastolic: z
    .number()
    .min(40, "DBP too low")
    .max(130, "DBP too high")
    .optional(),
  heartRate: z
    .number()
    .min(30, "HR too low")
    .max(200, "HR too high")
    .optional(),
  temperature: z
    .number()
    .min(32, "Temp too low")
    .max(43, "Temp too high")
    .optional(),
  spO2: z.number().min(0, "SpO2 invalid").max(100, "SpO2 invalid").optional(),
  respiratoryRate: z
    .number()
    .min(5, "RR too low")
    .max(50, "RR too high")
    .optional(),
  glucose: z
    .number()
    .min(20, "Glucose too low")
    .max(600, "Glucose too high")
    .optional(),
});

export const prescriptionMedicationSchema = z.object({
  name: z.string().min(1, "Medication required"),
  dosage: z
    .string()
    .regex(/^\d+(\.\d+)?\s*[a-zA-Z]+$/, "Use format: 500mg or 10ml"),
  frequency: z.enum([
    "OD",
    "BID",
    "TID",
    "QID",
    "QHS",
    "QAM",
    "Q4H",
    "Q6H",
    "Q8H",
    "Q12H",
    "PRN",
  ]),
  duration: z
    .string()
    .regex(/^\d+\s*(days?|weeks?|months?)$/, "Use format: 7 days"),
  route: z.enum([
    "PO",
    "IV",
    "IM",
    "SC",
    "TOP",
    "INH",
    "SL",
    "NAS",
    "OPH",
    "OT",
    "PR",
    "TD",
  ]),
});

export type VitalSignsInput = z.infer<typeof vitalSignsInputSchema>;
export type ValidationPrescriptionMedication = z.infer<
  typeof prescriptionMedicationSchema
>;

// ============================================================================
// ALLERGY CHECKING
// ============================================================================

export interface AllergyCheck {
  hasAllergy: boolean;
  allergyMatches: Array<{
    allergen: string;
    severity: string;
    reaction?: string;
  }>;
  warnings: string[];
}

/**
 * Common medication classes and their generic/brand names
 * Expanded to cover major drug families for comprehensive allergy checking
 */

/**
 * Check if a medication matches any of the patient's allergies
 */
