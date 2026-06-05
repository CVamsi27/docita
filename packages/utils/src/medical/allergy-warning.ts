import type { AllergyMatchResult } from "./allergy-matchers.js";

export interface PatientDrugAllergy {
  allergen: string;
  allergyType: string;
  severity: string;
  reaction?: string | null;
}

export function buildAllergyWarning(
  medicationName: string,
  allergy: PatientDrugAllergy,
  match: AllergyMatchResult,
): string {
  if (match.kind === "direct") {
    return `ALLERGY ALERT: Patient is allergic to ${allergy.allergen} (${allergy.severity}${allergy.reaction ? `, reaction: ${allergy.reaction}` : ""})`;
  }
  if (match.kind === "same-class") {
    return `CROSS-REACTIVITY WARNING: ${medicationName} shares class (${match.className}) with allergen ${allergy.allergen} (${allergy.severity})`;
  }
  return `CROSS-REACTIVITY WARNING: ${medicationName} (${match.crossReactiveClass}) may cross-react with ${allergy.allergen} (${match.className}) to which patient is allergic (${allergy.severity})`;
}
