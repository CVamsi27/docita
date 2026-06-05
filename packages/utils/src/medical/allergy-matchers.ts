import {
  CROSS_REACTIVITY_MAP,
  MEDICATION_CLASSES,
} from "./allergy-medication-classes.js";

export type AllergyMatchKind = "direct" | "same-class" | "cross-reactive";

export interface AllergyMatchResult {
  kind: AllergyMatchKind;
  className?: string;
  crossReactiveClass?: string;
}

export function findAllergyMatch(
  medLower: string,
  allergenLower: string,
): AllergyMatchResult | null {
  if (medLower.includes(allergenLower) || allergenLower.includes(medLower)) {
    return { kind: "direct" };
  }
  return findClassAllergyMatch(medLower, allergenLower);
}

function findClassAllergyMatch(
  medLower: string,
  allergenLower: string,
): AllergyMatchResult | null {
  for (const [className, medications] of Object.entries(MEDICATION_CLASSES)) {
    if (!medications.some((med) => allergenLower.includes(med))) continue;
    if (medications.some((med) => medLower.includes(med))) {
      return { kind: "same-class", className };
    }
    const crossReactiveClass = findCrossReactiveClass(className, medLower);
    if (crossReactiveClass) {
      return { kind: "cross-reactive", className, crossReactiveClass };
    }
  }
  return null;
}

function findCrossReactiveClass(
  className: string,
  medLower: string,
): string | null {
  for (const crossReactiveClass of CROSS_REACTIVITY_MAP[className] ?? []) {
    const medications = MEDICATION_CLASSES[crossReactiveClass] ?? [];
    if (medications.some((med) => medLower.includes(med))) {
      return crossReactiveClass;
    }
  }
  return null;
}
