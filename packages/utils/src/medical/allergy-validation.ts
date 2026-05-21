import type { AllergyCheck } from "@workspace/types";

const MEDICATION_CLASSES: Record<string, string[]> = {
  penicillins: [
    "penicillin",
    "amoxicillin",
    "ampicillin",
    "piperacillin",
    "augmentin",
    "amoxil",
    "unasyn",
  ],
  cephalosporins: [
    "cephalexin",
    "ceftriaxone",
    "cefixime",
    "cefuroxime",
    "ceftazidime",
    "keflex",
    "ceftin",
    "rocephin",
  ],
  carbapenems: ["meropenem", "imipenem", "ertapenem", "doripenem"],
  macrolides: [
    "azithromycin",
    "clarithromycin",
    "erythromycin",
    "zithromax",
    "biaxin",
  ],
  fluoroquinolones: [
    "ciprofloxacin",
    "levofloxacin",
    "moxifloxacin",
    "cipro",
    "levaquin",
  ],
  tetracyclines: ["doxycycline", "tetracycline", "minocycline", "vibramycin"],
  aminoglycosides: ["gentamicin", "tobramycin", "amikacin"],
  sulfonamides: [
    "sulfamethoxazole",
    "trimethoprim",
    "bactrim",
    "septra",
    "sulfa",
  ],
  nsaids: [
    "ibuprofen",
    "aspirin",
    "naproxen",
    "diclofenac",
    "celecoxib",
    "indomethacin",
    "ketorolac",
    "advil",
    "motrin",
    "aleve",
    "celebrex",
  ],
  opioids: [
    "morphine",
    "codeine",
    "hydrocodone",
    "oxycodone",
    "fentanyl",
    "tramadol",
    "vicodin",
    "percocet",
  ],
  statins: [
    "atorvastatin",
    "simvastatin",
    "rosuvastatin",
    "pravastatin",
    "lovastatin",
    "lipitor",
    "crestor",
    "zocor",
  ],
  ace_inhibitors: [
    "lisinopril",
    "enalapril",
    "ramipril",
    "captopril",
    "prinivil",
    "vasotec",
  ],
  arbs: [
    "losartan",
    "valsartan",
    "irbesartan",
    "olmesartan",
    "cozaar",
    "diovan",
  ],
  beta_blockers: [
    "metoprolol",
    "atenolol",
    "carvedilol",
    "propranolol",
    "bisoprolol",
    "lopressor",
    "tenormin",
    "coreg",
  ],
  calcium_channel_blockers: [
    "amlodipine",
    "diltiazem",
    "verapamil",
    "nifedipine",
    "norvasc",
    "cardizem",
  ],
  anticoagulants: [
    "warfarin",
    "heparin",
    "enoxaparin",
    "rivaroxaban",
    "apixaban",
    "dabigatran",
    "coumadin",
    "lovenox",
    "xarelto",
    "eliquis",
  ],
  sulfonylureas: [
    "glipizide",
    "glyburide",
    "glimepiride",
    "glucotrol",
    "diabeta",
  ],
  biguanides: ["metformin", "glucophage"],
  local_anesthetics: [
    "lidocaine",
    "bupivacaine",
    "ropivacaine",
    "procaine",
    "novocaine",
  ],
};

const CROSS_REACTIVITY_MAP: Record<string, string[]> = {
  penicillins: ["cephalosporins", "carbapenems"],
  cephalosporins: ["penicillins", "carbapenems"],
  carbapenems: ["penicillins", "cephalosporins"],
  sulfonamides: ["sulfonylureas"],
  sulfonylureas: ["sulfonamides"],
  nsaids: [],
};

export function checkMedicationAllergies(
  medicationName: string,
  patientAllergies: Array<{
    allergen: string;
    allergyType: string;
    severity: string;
    reaction?: string | null;
  }>,
): AllergyCheck {
  const result: AllergyCheck = {
    hasAllergy: false,
    allergyMatches: [],
    warnings: [],
  };

  const medLower = medicationName.toLowerCase().trim();

  const drugAllergies = patientAllergies.filter(
    (a) => a.allergyType === "DRUG",
  );

  for (const allergy of drugAllergies) {
    const allergenLower = allergy.allergen.toLowerCase().trim();

    if (medLower.includes(allergenLower) || allergenLower.includes(medLower)) {
      result.hasAllergy = true;
      result.allergyMatches.push({
        allergen: allergy.allergen,
        severity: allergy.severity,
        ...(allergy.reaction ? { reaction: allergy.reaction } : {}),
      });
      result.warnings.push(
        `ALLERGY ALERT: Patient is allergic to ${allergy.allergen} (${allergy.severity}${allergy.reaction ? `, reaction: ${allergy.reaction}` : ""})`,
      );
      continue;
    }

    for (const [className, medications] of Object.entries(MEDICATION_CLASSES)) {
      const allergenInClass = medications.some((med) =>
        allergenLower.includes(med),
      );
      const medInClass = medications.some((med) => medLower.includes(med));

      if (allergenInClass && medInClass) {
        result.hasAllergy = true;
        result.allergyMatches.push({
          allergen: allergy.allergen,
          severity: allergy.severity,
          ...(allergy.reaction ? { reaction: allergy.reaction } : {}),
        });
        result.warnings.push(
          `CROSS-REACTIVITY WARNING: ${medicationName} shares class (${className}) with allergen ${allergy.allergen} (${allergy.severity})`,
        );
        break;
      }

      if (allergenInClass && CROSS_REACTIVITY_MAP[className]) {
        for (const crossReactiveClass of CROSS_REACTIVITY_MAP[className]) {
          const crossReactiveMeds = MEDICATION_CLASSES[crossReactiveClass];
          const medInCrossReactiveClass = crossReactiveMeds?.some((med) =>
            medLower.includes(med),
          );

          if (medInCrossReactiveClass) {
            result.hasAllergy = true;
            result.allergyMatches.push({
              allergen: allergy.allergen,
              severity: allergy.severity,
              ...(allergy.reaction ? { reaction: allergy.reaction } : {}),
            });
            result.warnings.push(
              `CROSS-REACTIVITY WARNING: ${medicationName} (${crossReactiveClass}) may cross-react with ${allergy.allergen} (${className}) to which patient is allergic (${allergy.severity})`,
            );
            break;
          }
        }
      }
    }
  }

  return result;
}

export function checkPrescriptionAllergies(
  medications: Array<{ name: string; [key: string]: unknown }>,
  patientAllergies: Array<{
    allergen: string;
    allergyType: string;
    severity: string;
    reaction?: string | null;
  }>,
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
