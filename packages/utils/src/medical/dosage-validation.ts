import type {
  DosageRange,
  DosageValidation,
  PediatricDosageValidation,
} from "@workspace/types";

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
    max: 1000,
    unit: "mg",
    frequency: "once daily or 4-6 hourly",
    maxDaily: 4000,
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
  metronidazole: {
    min: 200,
    max: 400,
    unit: "mg",
    frequency: "8 hourly",
    maxDaily: 1200,
  },
  clindamycin: {
    min: 150,
    max: 300,
    unit: "mg",
    frequency: "6-8 hourly",
    maxDaily: 1800,
  },
  azithromycin: {
    min: 250,
    max: 500,
    unit: "mg",
    frequency: "once daily",
    maxDaily: 500,
  },
  cephalexin: {
    min: 250,
    max: 500,
    unit: "mg",
    frequency: "6 hourly",
    maxDaily: 2000,
  },
  tramadol: {
    min: 50,
    max: 100,
    unit: "mg",
    frequency: "4-6 hourly",
    maxDaily: 400,
  },
  codeine: {
    min: 15,
    max: 60,
    unit: "mg",
    frequency: "4-6 hourly",
    maxDaily: 360,
  },
  chlorhexidine: {
    min: 10,
    max: 15,
    unit: "ml",
    frequency: "twice daily",
    maxDaily: 30,
  },
};

export function validateDosage(
  medication: string,
  dosage: string,
): DosageValidation {
  const normalizedMed = medication.toLowerCase().trim();
  const range = COMMON_DOSAGE_RANGES[normalizedMed];

  const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
  if (!dosageMatch || !dosageMatch[1]) {
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
  const unit = dosageMatch[2] ?? "mg";

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

export const PEDIATRIC_DOSING_RULES: Record<
  string,
  (weight: number) => number
> = {
  paracetamol: (weight) => Math.min(weight * 15, 1000),
  ibuprofen: (weight) => Math.min(weight * 10, 400),
  amoxicillin: (weight) => Math.min(weight * 25, 500),
  metronidazole: (weight) => Math.min(weight * 7.5, 400),
  azithromycin: (weight) => Math.min(weight * 10, 500),
};

export function validatePediatricDosage(
  medication: string,
  dosage: string,
  weightKg: number,
): PediatricDosageValidation {
  const baseDosageValidation = validateDosage(medication, dosage);
  const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)/);
  const value = dosageMatch?.[1] ? parseFloat(dosageMatch[1]) : 0;

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
