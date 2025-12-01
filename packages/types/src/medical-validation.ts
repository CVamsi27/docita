import { z } from "zod";

/**
 * Medical Validation Schemas
 * Hospital-grade validation for vital signs, dosages, and clinical parameters
 * All ranges based on standard medical references (WHO, AHA, etc.)
 */

// ============================================================================
// VITAL SIGNS VALIDATION
// ============================================================================

export const VITAL_SIGNS_RANGES = {
  bloodPressureSystolic: { min: 70, max: 200, unit: "mmHg" },
  bloodPressureDiastolic: { min: 40, max: 130, unit: "mmHg" },
  heartRate: { min: 30, max: 200, unit: "bpm" },
  temperature: { min: 32, max: 43, unit: "°C" },
  spO2: { min: 0, max: 100, unit: "%" },
  respiratoryRate: { min: 5, max: 50, unit: "breaths/min" },
  glucose: { min: 20, max: 600, unit: "mg/dL" },
  weight: { min: 10, max: 500, unit: "kg" },
  height: { min: 50, max: 250, unit: "cm" },
};

export const VITAL_SIGNS_NORMAL_RANGES = {
  bloodPressureSystolic: { min: 90, max: 120, category: "normal" },
  bloodPressureDiastolic: { min: 60, max: 80, category: "normal" },
  heartRate: { min: 60, max: 100, category: "normal" },
  temperature: { min: 36.5, max: 37.5, category: "normal" },
  spO2: { min: 95, max: 100, category: "normal" },
  respiratoryRate: { min: 12, max: 20, category: "normal" },
  glucose: { min: 70, max: 100, category: "fasting" },
};

export interface VitalSignValidation {
  value: number;
  isValid: boolean;
  isNormal: boolean;
  message?: string;
  severity?: "warning" | "critical";
  suggestion?: string;
}

export function validateVitalSign(
  sign:
    | "bp_systolic"
    | "bp_diastolic"
    | "hr"
    | "temp"
    | "spo2"
    | "rr"
    | "glucose",
  value: number,
): VitalSignValidation {
  const ranges = VITAL_SIGNS_RANGES as Record<
    string,
    { min: number; max: number }
  >;
  const normalRanges = VITAL_SIGNS_NORMAL_RANGES as Record<
    string,
    { min: number; max: number; category: string }
  >;

  let rangeKey = "";
  let normalKey = "";

  switch (sign) {
    case "bp_systolic":
      rangeKey = "bloodPressureSystolic";
      normalKey = "bloodPressureSystolic";
      break;
    case "bp_diastolic":
      rangeKey = "bloodPressureDiastolic";
      normalKey = "bloodPressureDiastolic";
      break;
    case "hr":
      rangeKey = "heartRate";
      normalKey = "heartRate";
      break;
    case "temp":
      rangeKey = "temperature";
      normalKey = "temperature";
      break;
    case "spo2":
      rangeKey = "spO2";
      normalKey = "spO2";
      break;
    case "rr":
      rangeKey = "respiratoryRate";
      normalKey = "respiratoryRate";
      break;
    case "glucose":
      rangeKey = "glucose";
      normalKey = "glucose";
      break;
  }

  const range = ranges[rangeKey];
  const normal = normalRanges[normalKey];

  if (!range || !normal) {
    return { value, isValid: true, isNormal: true };
  }

  const isValid = value >= range.min && value <= range.max;
  const isNormal = value >= normal.min && value <= normal.max;

  if (!isValid) {
    return {
      value,
      isValid: false,
      isNormal: false,
      severity: "critical",
      message: `${sign.toUpperCase()} out of acceptable range (${range.min}-${range.max})`,
      suggestion: `Normal range: ${normal.min}-${normal.max}. Please verify measurement.`,
    };
  }

  if (!isNormal) {
    const severity = sign === "spo2" && value < 90 ? "critical" : "warning";
    return {
      value,
      isValid: true,
      isNormal: false,
      severity,
      message: `${sign.toUpperCase()} outside normal range (${normal.min}-${normal.max})`,
      suggestion: `Current: ${value}. Consider clinical follow-up if pattern continues.`,
    };
  }

  return { value, isValid: true, isNormal: true };
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

export const COMMON_DOSAGE_RANGES: Record<string, DosageRange> = {
  paracetamol: {
    min: 250,
    max: 1000,
    unit: "mg",
    frequency: "4-6 hourly",
    maxDaily: 4000,
  },
  ibuprofen: {
    min: 200,
    max: 800,
    unit: "mg",
    frequency: "4-6 hourly",
    maxDaily: 3200,
  },
  amoxicillin: {
    min: 250,
    max: 500,
    unit: "mg",
    frequency: "8 hourly",
    maxDaily: 1500,
  },
  metformin: {
    min: 500,
    max: 1000,
    unit: "mg",
    frequency: "2-3 times daily",
    maxDaily: 2500,
  },
  lisinopril: {
    min: 5,
    max: 40,
    unit: "mg",
    frequency: "once daily",
    maxDaily: 40,
  },
  atorvastatin: {
    min: 10,
    max: 80,
    unit: "mg",
    frequency: "once daily",
    maxDaily: 80,
  },
  omeprazole: {
    min: 20,
    max: 40,
    unit: "mg",
    frequency: "once daily",
    maxDaily: 40,
  },
  aspirin: {
    min: 75,
    max: 325,
    unit: "mg",
    frequency: "once daily",
    maxDaily: 325,
  },
  metoprolol: {
    min: 25,
    max: 100,
    unit: "mg",
    frequency: "2-3 times daily",
    maxDaily: 300,
  },
  amlodipine: {
    min: 2.5,
    max: 10,
    unit: "mg",
    frequency: "once daily",
    maxDaily: 10,
  },
};

export interface DosageValidation {
  dosage: string;
  medication: string;
  isValid: boolean;
  isStandard: boolean;
  message?: string;
  severity?: "info" | "warning" | "critical";
  suggestion?: string;
}

export function validateDosage(
  medication: string,
  dosage: string,
): DosageValidation {
  const normalizedMed = medication.toLowerCase().trim();
  const range = COMMON_DOSAGE_RANGES[normalizedMed];

  // Parse dosage string (e.g., "500mg" or "500 mg")
  const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
  if (!dosageMatch) {
    return {
      dosage,
      medication,
      isValid: false,
      isStandard: false,
      severity: "warning",
      message: "Could not parse dosage format",
      suggestion: 'Use format like "500mg" or "500 mg"',
    };
  }

  const value = parseFloat(dosageMatch[1]);
  const unit = dosageMatch[2] || "mg";

  if (!range) {
    return {
      dosage,
      medication,
      isValid: true,
      isStandard: false,
      severity: "info",
      message: `No standard dosage range available for ${medication}`,
      suggestion: "Verify dosage from prescribing reference.",
    };
  }

  if (value < range.min || value > range.max) {
    return {
      dosage,
      medication,
      isValid: false,
      isStandard: false,
      severity: "critical",
      message: `Dosage ${value}${unit} is outside standard range (${range.min}-${range.max}${unit})`,
      suggestion: `Standard range: ${range.min}-${range.max}${unit} ${range.frequency}. Max daily: ${range.maxDaily}${unit}`,
    };
  }

  return {
    dosage,
    medication,
    isValid: true,
    isStandard: true,
    message: "Dosage within standard range",
  };
}

// ============================================================================
// PEDIATRIC DOSING
// ============================================================================

export interface PediatricDosageValidation extends DosageValidation {
  ageInMonths: number;
  weight: number;
  adjustedDosage?: string;
}

export const PEDIATRIC_DOSING_RULES: Record<
  string,
  (weight: number) => number
> = {
  paracetamol: (weight) => Math.min(weight * 15, 1000), // 15 mg/kg, max 1000mg
  ibuprofen: (weight) => Math.min(weight * 10, 400), // 10 mg/kg, max 400mg
  amoxicillin: (weight) => Math.min(weight * 25, 500), // 25 mg/kg, max 500mg
};

export function validatePediatricDosage(
  medication: string,
  dosage: string,
  weightKg: number,
): PediatricDosageValidation {
  const baseDosageValidation = validateDosage(medication, dosage);
  const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)/);
  const value = dosageMatch ? parseFloat(dosageMatch[1]) : 0;

  const normalizedMed = medication.toLowerCase();
  const dosageCalculator = PEDIATRIC_DOSING_RULES[normalizedMed];

  if (!dosageCalculator) {
    return {
      ...baseDosageValidation,
      ageInMonths: 0,
      weight: weightKg,
    };
  }

  const maxPediatricDosage = dosageCalculator(weightKg);

  if (value > maxPediatricDosage) {
    return {
      ...baseDosageValidation,
      ageInMonths: 0,
      weight: weightKg,
      isValid: false,
      severity: "critical",
      message: `Pediatric dosage ${value}mg exceeds weight-based limit (${maxPediatricDosage}mg)`,
      suggestion: `For ${weightKg}kg child, max dosage: ${maxPediatricDosage}mg`,
      adjustedDosage: `${maxPediatricDosage}mg`,
    };
  }

  return {
    ...baseDosageValidation,
    ageInMonths: 0,
    weight: weightKg,
    message: "Pediatric dosage appropriate for weight",
  };
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

export const RENAL_DOSAGE_ADJUSTMENTS: Record<
  string,
  Record<RenalFunction, number>
> = {
  metformin: {
    normal: 100,
    mild: 100,
    moderate: 50, // Reduce to 50%
    severe: 0, // Contraindicated
    esrd: 0,
  },
  lisinopril: {
    normal: 100,
    mild: 75,
    moderate: 50,
    severe: 25,
    esrd: 10,
  },
  atorvastatin: {
    normal: 100,
    mild: 100,
    moderate: 100,
    severe: 50,
    esrd: 50,
  },
};

export function validateRenalDosage(
  medication: string,
  dosage: string,
  renalFunction: RenalFunction,
): RenalDosageAdjustment {
  const normalizedMed = medication.toLowerCase();
  const adjustments = RENAL_DOSAGE_ADJUSTMENTS[normalizedMed];

  if (!adjustments) {
    return {
      medication,
      originalDosage: dosage,
      renalFunction,
      message: "No specific renal dosing adjustment available",
      requiresMonitoring: false,
    };
  }

  const adjustmentPercent = adjustments[renalFunction];
  const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)/);
  const value = dosageMatch ? parseFloat(dosageMatch[1]) : 0;
  const adjustedValue = (value * adjustmentPercent) / 100;

  if (adjustmentPercent === 0) {
    return {
      medication,
      originalDosage: dosage,
      renalFunction,
      message: `${medication} is CONTRAINDICATED in ${renalFunction} renal function`,
      requiresMonitoring: true,
    };
  }

  return {
    medication,
    originalDosage: dosage,
    renalFunction,
    adjustedDosage: `${adjustedValue}mg (${adjustmentPercent}% of normal)`,
    message: `For ${renalFunction} renal function: reduce to ${adjustmentPercent}% of normal dose`,
    requiresMonitoring: renalFunction !== "normal",
  };
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

export const PREGNANCY_CATEGORIES: Record<string, PregnancyCategory> = {
  paracetamol: "A",
  prenatal_vitamins: "A",
  penicillin: "B",
  amoxicillin: "B",
  cephalexin: "B",
  ibuprofen: "D", // Contraindicated
  aspirin: "D", // Contraindicated in 3rd trimester
  atorvastatin: "X", // Absolute contraindication
  lisinopril: "D", // Contraindicated
  metformin: "B",
  omeprazole: "C",
};

export const PREGNANCY_ALTERNATIVES: Record<string, string[]> = {
  ibuprofen: ["acetaminophen"],
  aspirin: ["acetaminophen"],
  atorvastatin: ["pravastatin", "rosuvastatin"],
  lisinopril: ["labetalol", "nifedipine"],
};

export function validatePregnancyContraindication(
  medication: string,
  isPregnant: boolean,
): PregnancyContraindication {
  const normalizedMed = medication.toLowerCase();
  const category = PREGNANCY_CATEGORIES[normalizedMed];

  if (!isPregnant) {
    return {
      medication,
      category: "B",
      isContraindicated: false,
      message: "Patient not pregnant",
    };
  }

  if (!category) {
    return {
      medication,
      category: "C",
      isContraindicated: false,
      message: `Pregnancy category for ${medication} not found. Verify before prescribing.`,
    };
  }

  const isContraindicated = category === "D" || category === "X";
  const alternatives = PREGNANCY_ALTERNATIVES[normalizedMed] || [];

  return {
    medication,
    category,
    isContraindicated,
    message: isContraindicated
      ? `${medication} is CONTRAINDICATED in pregnancy (Category ${category})`
      : `${medication} is generally safe in pregnancy (Category ${category})`,
    alternativeMedications: alternatives,
  };
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
export type PrescriptionMedication = z.infer<
  typeof prescriptionMedicationSchema
>;
