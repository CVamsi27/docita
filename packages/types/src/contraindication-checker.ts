/**
 * Contraindication Checking Engine
 * Hospital-grade medication contraindication validation
 * Checks patient conditions, allergies, and medication interactions
 */

export interface Allergy {
  name: string;
  severity: "mild" | "moderate" | "severe";
}

export interface PatientCondition {
  icdCode: string;
  name: string;
}

export interface ContraindicationCheck {
  isContraindicated: boolean;
  severity: "info" | "warning" | "critical";
  reason:
    | "allergy"
    | "condition"
    | "interaction"
    | "pregnancy"
    | "renal"
    | "hepatic";
  message: string;
  recommendation: string;
  alternatives?: string[];
}

/**
 * Absolute and relative contraindications mapped by medication
 */
export const MEDICATION_CONTRAINDICATIONS: Record<
  string,
  {
    absoluteConditions?: string[];
    relativeConditions?: string[];
    allergyGroups?: string[]; // e.g., "penicillins", "sulfonamides"
    pregnancyContraindicated?: boolean;
    renalContraindicated?: boolean;
    hepaticContraindicated?: boolean;
  }
> = {
  // NSAIDs
  ibuprofen: {
    absoluteConditions: [
      "active peptic ulcer",
      "severe renal disease",
      "severe heart failure",
    ],
    relativeConditions: ["chronic kidney disease", "asthma", "hypertension"],
    pregnancyContraindicated: true,
    allergyGroups: ["nsaids"],
  },
  naproxen: {
    absoluteConditions: [
      "active peptic ulcer",
      "severe renal disease",
      "severe heart failure",
    ],
    relativeConditions: ["chronic kidney disease", "asthma"],
    allergyGroups: ["nsaids"],
  },

  // ACE Inhibitors
  lisinopril: {
    absoluteConditions: ["angioedema history"],
    relativeConditions: ["hyperkalemia", "bilateral renal artery stenosis"],
    pregnancyContraindicated: true,
  },
  enalapril: {
    absoluteConditions: ["angioedema history"],
    relativeConditions: ["hyperkalemia"],
    pregnancyContraindicated: true,
  },

  // Beta Blockers
  metoprolol: {
    absoluteConditions: [
      "uncontrolled asthma",
      "severe bradycardia",
      "cardiogenic shock",
    ],
    relativeConditions: ["asthma", "copd", "diabetes"],
  },
  propranolol: {
    absoluteConditions: ["uncontrolled asthma", "bradycardia", "asthma"],
    relativeConditions: ["diabetes", "peripheral arterial disease"],
  },

  // Statins
  atorvastatin: {
    relativeConditions: ["liver disease", "muscle disorders"],
    pregnancyContraindicated: true,
  },
  simvastatin: {
    relativeConditions: ["liver disease", "myopathy"],
    pregnancyContraindicated: true,
  },

  // Anticoagulants
  warfarin: {
    absoluteConditions: ["active bleeding", "thrombocytopenia"],
    relativeConditions: ["peptic ulcer disease", "recent trauma"],
    pregnancyContraindicated: true,
  },

  // PPIs
  omeprazole: {
    relativeConditions: ["prolonged use"],
  },

  // Metformin
  metformin: {
    absoluteConditions: ["severe renal disease"],
    relativeConditions: ["moderate chronic kidney disease", "heart failure"],
    pregnancyContraindicated: false, // Generally safe
  },

  // Fluoroquinolones
  ciprofloxacin: {
    relativeConditions: ["myasthenia gravis", "qT prolongation"],
  },
  levofloxacin: {
    relativeConditions: ["myasthenia gravis", "qT prolongation"],
  },

  // Antihistamines
  diphenhydramine: {
    relativeConditions: [
      "glaucoma",
      "urinary retention",
      "benign prostatic hyperplasia",
    ],
  },

  // Aspirin
  aspirin: {
    absoluteConditions: ["active bleeding", "severe thrombocytopenia"],
    pregnancyContraindicated: true,
    allergyGroups: ["salicylates"],
  },

  // Antibiotics
  amoxicillin: {
    allergyGroups: ["penicillins", "beta-lactams"],
    relativeConditions: ["infectious mononucleosis"],
  },
  azithromycin: {
    relativeConditions: ["qT prolongation", "myasthenia gravis"],
  },

  // Theophylline
  theophylline: {
    relativeConditions: ["cardiac arrhythmias", "uncontrolled hypertension"],
  },

  // Opioids
  morphine: {
    absoluteConditions: ["respiratory depression", "ileus"],
    relativeConditions: ["copd", "sleep apnea", "liver disease"],
  },
};

/**
 * Drug-drug interaction contraindications (absolute conflicts)
 */
export const MAJOR_DRUG_INTERACTIONS: Array<{
  drug1: string;
  drug2: string;
  reason: string;
  alternatives?: { replace: string; with: string[] }[];
}> = [
  {
    drug1: "warfarin",
    drug2: "aspirin",
    reason: "Significantly increased bleeding risk",
    alternatives: [
      { replace: "aspirin", with: ["acetaminophen", "clopidogrel"] },
    ],
  },
  {
    drug1: "metformin",
    drug2: "contrast dye",
    reason: "Risk of lactic acidosis and acute renal failure",
  },
  {
    drug1: "ssri",
    drug2: "maoi",
    reason: "Serotonin syndrome - potentially fatal",
  },
  {
    drug1: "ciprofloxacin",
    drug2: "tizanidine",
    reason: "Severe increase in tizanidine levels (contraindicated)",
  },
  {
    drug1: "statin",
    drug2: "fibrate",
    reason: "Increased myopathy and rhabdomyolysis risk",
  },
  {
    drug1: "ace inhibitor",
    drug2: "potassium sparing diuretic",
    reason: "Risk of hyperkalemia",
  },
];

/**
 * Allergy groups that share cross-reactivity
 */
export const ALLERGY_GROUPS: Record<string, string[]> = {
  penicillins: [
    "amoxicillin",
    "ampicillin",
    "penicillin v",
    "penicillin g",
    "piperacillin",
  ],
  cephalosporins: ["cephalexin", "ceftriaxone", "cefazolin", "cefepime"],
  sulfonamides: ["sulfamethoxazole", "sulfadiazine", "sulfasalazine"],
  nsaids: ["ibuprofen", "naproxen", "diclofenac", "meloxicam", "celecoxib"],
  "beta-lactams": [
    "penicillins",
    "cephalosporins",
    "carbapenems",
    "monobactams",
  ],
  fluoroquinolones: ["ciprofloxacin", "levofloxacin", "moxifloxacin"],
  statins: ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"],
  ssris: [
    "fluoxetine",
    "sertraline",
    "paroxetine",
    "escitalopram",
    "citalopram",
  ],
  salicylates: ["aspirin", "bismuth subsalicylate"],
};

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function medicationInGroup(medication: string, group: string[]): boolean {
  const normalized = normalizeText(medication);
  return group.some((med) => normalized.includes(normalizeText(med)));
}

/**
 * Check if medication is contraindicated based on patient conditions
 */
export function checkConditionContraindications(
  medication: string,
  patientConditions: PatientCondition[],
): ContraindicationCheck | null {
  const normalizedMed = normalizeText(medication);
  const contraindications = Object.entries(MEDICATION_CONTRAINDICATIONS).find(
    ([key]) => normalizedMed.includes(normalizeText(key)),
  );

  if (!contraindications) {
    return null; // No known contraindications
  }

  const [medName, rules] = contraindications;
  const conditionNames = patientConditions.map((c) => normalizeText(c.name));

  // Check absolute contraindications
  if (rules.absoluteConditions) {
    for (const condition of rules.absoluteConditions) {
      if (
        conditionNames.some(
          (c) =>
            c.includes(normalizeText(condition)) ||
            normalizeText(condition).includes(c),
        )
      ) {
        return {
          isContraindicated: true,
          severity: "critical",
          reason: "condition",
          message: `${medication} is ABSOLUTELY CONTRAINDICATED in ${condition}`,
          recommendation: `Do not prescribe. Consider alternative medications.`,
        };
      }
    }
  }

  // Check relative contraindications
  if (rules.relativeConditions) {
    for (const condition of rules.relativeConditions) {
      if (
        conditionNames.some(
          (c) =>
            c.includes(normalizeText(condition)) ||
            normalizeText(condition).includes(c),
        )
      ) {
        return {
          isContraindicated: false,
          severity: "warning",
          reason: "condition",
          message: `${medication} requires caution in ${condition}`,
          recommendation: `Use with caution. Consider dose adjustment or monitoring.`,
        };
      }
    }
  }

  return null;
}

/**
 * Check if medication causes allergic reaction
 */
export function checkAllergyContraindications(
  medication: string,
  patientAllergies: Allergy[],
): ContraindicationCheck | null {
  const normalizedMed = normalizeText(medication);

  // Direct medication allergy
  if (
    patientAllergies.some(
      (allergy) =>
        normalizedMed.includes(normalizeText(allergy.name)) ||
        normalizeText(allergy.name).includes(normalizedMed),
    )
  ) {
    const severity = patientAllergies.find(
      (a) => normalizeText(a.name) === normalizedMed,
    )?.severity;

    return {
      isContraindicated: severity === "severe",
      severity: severity === "severe" ? "critical" : "warning",
      reason: "allergy",
      message: `Patient has documented ${severity} allergy to ${medication}`,
      recommendation:
        severity === "severe"
          ? "CONTRAINDICATED. Do not prescribe."
          : "Use alternative if available.",
    };
  }

  // Cross-reactivity with allergy groups
  for (const [groupName, medications] of Object.entries(ALLERGY_GROUPS)) {
    // Check if patient allergic to this group
    const allergyInGroup = patientAllergies.some((allergy) =>
      medicationInGroup(allergy.name, [groupName]),
    );

    if (allergyInGroup) {
      // Check if prescribed med is in same group
      if (medicationInGroup(medication, medications)) {
        return {
          isContraindicated: true,
          severity: "critical",
          reason: "allergy",
          message: `${medication} is a ${groupName} - patient allergic to this class`,
          recommendation: `CONTRAINDICATED due to cross-reactivity. Use alternative class.`,
        };
      }
    }
  }

  return null;
}

/**
 * Check for major drug-drug interactions
 */
export function checkDrugDrugContraindications(
  medication: string,
  currentMedications: string[],
): ContraindicationCheck | null {
  const normalizedNew = normalizeText(medication);

  for (const currentMed of currentMedications) {
    const normalizedCurrent = normalizeText(currentMed);

    // Check each major interaction
    for (const interaction of MAJOR_DRUG_INTERACTIONS) {
      const drug1 = normalizeText(interaction.drug1);
      const drug2 = normalizeText(interaction.drug2);

      // Match both directions
      const match =
        (normalizedNew.includes(drug1) && normalizedCurrent.includes(drug2)) ||
        (normalizedNew.includes(drug2) && normalizedCurrent.includes(drug1));

      if (match) {
        return {
          isContraindicated: true,
          severity: "critical",
          reason: "interaction",
          message: `MAJOR INTERACTION: ${medication} + ${currentMed}. ${interaction.reason}`,
          recommendation: `Avoid combination. Consider alternatives.`,
          alternatives: interaction.alternatives
            ? interaction.alternatives.flatMap((a) => a.with)
            : undefined,
        };
      }
    }
  }

  return null;
}

/**
 * Comprehensive contraindication check
 */
export function checkMedicationContraindications(
  medication: string,
  patientData: {
    allergies?: Allergy[];
    conditions?: PatientCondition[];
    currentMedications?: string[];
    isPregnant?: boolean;
    renalFunctionCategory?: "normal" | "mild" | "moderate" | "severe" | "esrd";
    hepaticFunctionCategory?: "normal" | "mild" | "moderate" | "severe";
  },
): ContraindicationCheck[] {
  const contraindications: ContraindicationCheck[] = [];

  // Check conditions
  if (patientData.conditions) {
    const condCheck = checkConditionContraindications(
      medication,
      patientData.conditions,
    );
    if (condCheck) contraindications.push(condCheck);
  }

  // Check allergies
  if (patientData.allergies) {
    const allergyCheck = checkAllergyContraindications(
      medication,
      patientData.allergies,
    );
    if (allergyCheck) contraindications.push(allergyCheck);
  }

  // Check drug-drug interactions
  if (patientData.currentMedications) {
    const drugCheck = checkDrugDrugContraindications(
      medication,
      patientData.currentMedications,
    );
    if (drugCheck) contraindications.push(drugCheck);
  }

  // Check pregnancy
  if (patientData.isPregnant) {
    const rules = Object.entries(MEDICATION_CONTRAINDICATIONS).find(([key]) =>
      normalizeText(medication).includes(normalizeText(key)),
    );

    if (rules && rules[1].pregnancyContraindicated) {
      contraindications.push({
        isContraindicated: true,
        severity: "critical",
        reason: "pregnancy",
        message: `${medication} is CONTRAINDICATED in pregnancy`,
        recommendation: "Use alternative medication. Consult obstetrics.",
      });
    }
  }

  return contraindications;
}
