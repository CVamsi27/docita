import type { AllergyCheck } from "@workspace/types";
import {
  type AllergyMatchResult,
  findAllergyMatch,
} from "./allergy-matchers.js";
import {
  buildAllergyWarning,
  type PatientDrugAllergy,
} from "./allergy-warning.js";

export function checkMedicationAllergies(
  medicationName: string,
  patientAllergies: PatientDrugAllergy[],
): AllergyCheck {
  const result: AllergyCheck = {
    hasAllergy: false,
    allergyMatches: [],
    warnings: [],
  };

  const medLower = medicationName.toLowerCase().trim();

  const drugAllergies = patientAllergies.filter(isDrugAllergy);

  for (const allergy of drugAllergies) {
    const allergenLower = allergy.allergen.toLowerCase().trim();
    const match = findAllergyMatch(medLower, allergenLower);
    if (match) appendAllergyMatch(result, medicationName, allergy, match);
  }

  return result;
}

export function checkPrescriptionAllergies(
  medications: Array<{ name: string; [key: string]: unknown }>,
  patientAllergies: PatientDrugAllergy[],
): {
  hasAllergies: boolean;
  medicationChecks: Array<{
    medication: string;
    allergyCheck: AllergyCheck;
  }>;
  criticalWarnings: string[];
  allWarnings: string[];
} {
  const medicationChecks = medications.map((med) => ({
    medication: med.name,
    allergyCheck: checkMedicationAllergies(med.name, patientAllergies),
  }));

  const hasAllergies = medicationChecks.some(
    (mc) => mc.allergyCheck.hasAllergy,
  );

  const allWarnings = medicationChecks.flatMap(
    (mc) => mc.allergyCheck.warnings,
  );

  const criticalWarnings = medicationChecks
    .filter((mc) =>
      mc.allergyCheck.allergyMatches.some(
        (a) => a.severity === "SEVERE" || a.severity === "LIFE_THREATENING",
      ),
    )
    .flatMap((mc) => mc.allergyCheck.warnings);

  return {
    hasAllergies,
    medicationChecks,
    criticalWarnings,
    allWarnings,
  };
}

function isDrugAllergy(allergy: PatientDrugAllergy): boolean {
  return allergy.allergyType === "DRUG";
}

function appendAllergyMatch(
  result: AllergyCheck,
  medicationName: string,
  allergy: PatientDrugAllergy,
  match: AllergyMatchResult,
): void {
  result.hasAllergy = true;
  result.allergyMatches.push({
    allergen: allergy.allergen,
    severity: allergy.severity,
    ...(allergy.reaction ? { reaction: allergy.reaction } : {}),
  });
  result.warnings.push(buildAllergyWarning(medicationName, allergy, match));
}
