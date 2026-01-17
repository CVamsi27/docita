import {
  AllergyCheck,
  DosageRange,
  DosageValidation,
  PediatricDosageValidation,
  PregnancyCategory,
  PregnancyContraindication,
  RenalDosageAdjustment,
  RenalFunction,
  VitalSignValidation,
} from "@workspace/types";

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

  // ===== Dental Medications =====
  // Antibiotics for dental infections
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

  // Analgesics for dental pain
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

  // Topical antiseptic
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

  // Parse dosage string (e.g., "500mg" or "500 mg")
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

// ============================================================================
// PEDIATRIC DOSING
// ============================================================================

export const PEDIATRIC_DOSING_RULES: Record<
  string,
  (weight: number) => number
> = {
  paracetamol: (weight) => Math.min(weight * 15, 1000), // 15 mg/kg, max 1000mg
  ibuprofen: (weight) => Math.min(weight * 10, 400), // 10 mg/kg, max 400mg
  amoxicillin: (weight) => Math.min(weight * 25, 500), // 25 mg/kg, max 500mg

  // Dental antibiotics
  metronidazole: (weight) => Math.min(weight * 7.5, 400), // 7.5 mg/kg, max 400mg
  azithromycin: (weight) => Math.min(weight * 10, 500), // 10 mg/kg, max 500mg
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

// ============================================================================
// RENAL/HEPATIC DOSING
// ============================================================================

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

// ============================================================================
// PREGNANCY CONTRAINDICATION
// ============================================================================

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

// ============================================================================
// ALLERGY CHECKING
// ============================================================================

/**
 * Common medication classes and their generic/brand names
 * Expanded to cover major drug families for comprehensive allergy checking
 */
const MEDICATION_CLASSES: Record<string, string[]> = {
  // Beta-Lactam Antibiotics
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

  // Other Antibiotics
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

  // Pain & Inflammation
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

  // Cardiovascular
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

  // Anticoagulants
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

  // Diabetes
  sulfonylureas: [
    "glipizide",
    "glyburide",
    "glimepiride",
    "glucotrol",
    "diabeta",
  ],
  biguanides: ["metformin", "glucophage"],

  // Local Anesthetics
  local_anesthetics: [
    "lidocaine",
    "bupivacaine",
    "ropivacaine",
    "procaine",
    "novocaine",
  ],
};

/**
 * Cross-reactivity rules: medications that can cause reactions if patient is allergic to another class
 * Key: allergen class, Value: classes that may cross-react
 *
 * Based on clinical evidence:
 * - Penicillin → Cephalosporin: ~10% cross-reactivity (shared beta-lactam ring)
 * - Penicillin → Carbapenem: ~1% cross-reactivity (lower risk)
 * - Sulfonamide antibiotics may cross-react with sulfonylureas (both contain sulfa group)
 * - NSAIDs may cross-react within class due to COX inhibition mechanism
 */
const CROSS_REACTIVITY_MAP: Record<string, string[]> = {
  penicillins: ["cephalosporins", "carbapenems"], // 10% and 1% cross-reactivity respectively
  cephalosporins: ["penicillins", "carbapenems"],
  carbapenems: ["penicillins", "cephalosporins"],
  sulfonamides: ["sulfonylureas"], // Cross-reactivity with sulfa-containing drugs
  sulfonylureas: ["sulfonamides"],
  nsaids: [], // All NSAIDs can cross-react, but handled within same class
};

/**
 * Check if a medication matches any of the patient's allergies
 */
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

  // Filter only drug allergies
  const drugAllergies = patientAllergies.filter(
    (a) => a.allergyType === "DRUG",
  );

  for (const allergy of drugAllergies) {
    const allergenLower = allergy.allergen.toLowerCase().trim();

    // Direct match
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

    // Check medication class cross-reactivity
    for (const [className, medications] of Object.entries(MEDICATION_CLASSES)) {
      const allergenInClass = medications.some((med) =>
        allergenLower.includes(med),
      );
      const medInClass = medications.some((med) => medLower.includes(med));

      // Same class match
      if (allergenInClass && medInClass) {
        result.hasAllergy = true;
        result.allergyMatches.push({
          allergen: allergy.allergen,
          severity: allergy.severity,
          ...(allergy.reaction ? { reaction: allergy.reaction } : {}),
        });
        result.warnings.push(
          `CROSS-REACTIVITY WARNING: ${medicationName} is in the same class (${className}) as ${allergy.allergen} to which patient is allergic (${allergy.severity})`,
        );
        break;
      }

      // Check cross-reactive classes (e.g., penicillin → cephalosporin)
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

/**
 * Check multiple medications against patient allergies
 */
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
