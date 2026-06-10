import { z } from "zod";

export interface VitalSignValidation {
  value: number;
  isValid: boolean;
  isNormal: boolean;
  message?: string;
  severity?: "warning" | "critical";
  suggestion?: string;
}

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

export interface PediatricDosageValidation extends DosageValidation {
  ageInMonths: number;
  weight: number;
  adjustedDosage?: string;
}

export type RenalFunction = "normal" | "mild" | "moderate" | "severe" | "esrd";

export interface RenalDosageAdjustment {
  medication: string;
  originalDosage: string;
  renalFunction: RenalFunction;
  adjustedDosage?: string;
  message: string;
  requiresMonitoring: boolean;
}

export type PregnancyCategory = "A" | "B" | "C" | "D" | "X";

export interface PregnancyContraindication {
  medication: string;
  category: PregnancyCategory;
  isContraindicated: boolean;
  message: string;
  alternativeMedications?: string[];
}

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
 * Indian regulatory classes that constrain how a drug may be prescribed.
 * - `SCHEDULE_X`: Schedule X of the Drugs and Cosmetics Rules, 1945 — requires
 *   a special prescription retained for 2 years; cannot be prescribed via
 *   telemedicine (NMC Telemedicine Practice Guidelines, 2020).
 * - `NDPS_NARCOTIC`: Narcotic under the NDPS Act, 1985.
 * - `PSYCHOTROPIC`: Psychotropic under the NDPS Act, 1985.
 */
export type ControlledSubstanceSchedule =
  | "SCHEDULE_X"
  | "NDPS_NARCOTIC"
  | "PSYCHOTROPIC";

export interface ControlledSubstanceMatch {
  medication: string;
  matchedTerm: string;
  schedule: ControlledSubstanceSchedule;
}

export interface ControlledSubstanceCheck {
  hasControlledSubstance: boolean;
  matches: ControlledSubstanceMatch[];
  warnings: string[];
}

/** Context that decides whether a controlled-substance match blocks or warns. */
export interface ControlledSubstanceContext {
  /** True when the prescription is issued during a teleconsultation. */
  isTeleconsultation: boolean;
}

export interface ControlledSubstanceValidation {
  isBlocked: boolean;
  /** Stable error code surfaced to the client when blocked. */
  code?: "CONTROLLED_SUBSTANCE_TELEMEDICINE_BLOCKED";
  message?: string;
  check: ControlledSubstanceCheck;
}

