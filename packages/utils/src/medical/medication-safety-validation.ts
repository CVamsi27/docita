import type {
  PregnancyCategory,
  PregnancyContraindication,
  RenalDosageAdjustment,
  RenalFunction,
} from "@workspace/types";

export const RENAL_DOSAGE_ADJUSTMENTS: Record<
  string,
  Record<RenalFunction, number>
> = {
  metformin: {
    normal: 100,
    mild: 100,
    moderate: 50,
    severe: 0,
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

  const adjustmentPercent = adjustments[renalFunction] ?? 100;
  const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)/);
  const value = dosageMatch?.[1] ? parseFloat(dosageMatch[1]) : 0;
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

export const PREGNANCY_CATEGORIES: Record<string, PregnancyCategory> = {
  paracetamol: "A",
  prenatal_vitamins: "A",
  penicillin: "B",
  amoxicillin: "B",
  cephalexin: "B",
  ibuprofen: "D",
  aspirin: "D",
  atorvastatin: "X",
  lisinopril: "D",
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
