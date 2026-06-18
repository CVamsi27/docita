import type {
  ControlledSubstanceCheck,
  ControlledSubstanceContext,
  ControlledSubstanceMatch,
  ControlledSubstanceSchedule,
  ControlledSubstanceValidation,
} from "@workspace/types";

/**
 * Generic (INN) names of drugs whose prescribing is constrained under Indian
 * law. Matched as case-insensitive whole-word substrings against the
 * medication name, so brand names that embed the generic (e.g. "Alprax" does
 * NOT contain "alprazolam") are intentionally not caught — clinicians should
 * prescribe by generic name, and the list is a safety net, not a formulary.
 *
 * Sources: Schedule X, Drugs and Cosmetics Rules 1945; NDPS Act 1985 schedules.
 * This list is deliberately conservative (common molecules); extend as needed.
 */
const CONTROLLED_SUBSTANCES: Record<string, ControlledSubstanceSchedule> = {
  // Schedule X (barbiturates, amphetamine-type stimulants, select sedatives)
  amobarbital: "SCHEDULE_X",
  amphetamine: "SCHEDULE_X",
  barbital: "SCHEDULE_X",
  dexamphetamine: "SCHEDULE_X",
  glutethimide: "SCHEDULE_X",
  methamphetamine: "SCHEDULE_X",
  methaqualone: "SCHEDULE_X",
  methylphenidate: "SCHEDULE_X",
  pentobarbital: "SCHEDULE_X",
  phenobarbital: "SCHEDULE_X",
  secobarbital: "SCHEDULE_X",

  // NDPS narcotics (opioids)
  buprenorphine: "NDPS_NARCOTIC",
  codeine: "NDPS_NARCOTIC",
  fentanyl: "NDPS_NARCOTIC",
  hydrocodone: "NDPS_NARCOTIC",
  methadone: "NDPS_NARCOTIC",
  morphine: "NDPS_NARCOTIC",
  oxycodone: "NDPS_NARCOTIC",
  pethidine: "NDPS_NARCOTIC",
  pentazocine: "NDPS_NARCOTIC",
  tapentadol: "NDPS_NARCOTIC",
  tramadol: "NDPS_NARCOTIC",

  // NDPS psychotropics (benzodiazepines and related)
  alprazolam: "PSYCHOTROPIC",
  clonazepam: "PSYCHOTROPIC",
  diazepam: "PSYCHOTROPIC",
  lorazepam: "PSYCHOTROPIC",
  midazolam: "PSYCHOTROPIC",
  nitrazepam: "PSYCHOTROPIC",
  zolpidem: "PSYCHOTROPIC",
};

const SCHEDULE_LABEL: Record<ControlledSubstanceSchedule, string> = {
  SCHEDULE_X: "Schedule X",
  NDPS_NARCOTIC: "NDPS narcotic",
  PSYCHOTROPIC: "NDPS psychotropic",
};

function matchControlledSubstance(
  medicationName: string,
): ControlledSubstanceMatch | null {
  const lower = medicationName.toLowerCase();
  for (const [term, schedule] of Object.entries(CONTROLLED_SUBSTANCES)) {
    // whole-word match so "codeine" doesn't match a longer unrelated token
    const re = new RegExp(`\\b${term}\\b`, "i");
    if (re.test(lower)) {
      return { medication: medicationName, matchedTerm: term, schedule };
    }
  }
  return null;
}

/**
 * Flags every medication in a prescription that falls under Schedule X or the
 * NDPS Act. Pure: no blocking decision here — see
 * {@link validateControlledSubstances} for the context-aware ruling.
 */
export function checkControlledSubstances(
  medications: Array<{ name: string; [key: string]: unknown }>,
): ControlledSubstanceCheck {
  const matches: ControlledSubstanceMatch[] = [];
  for (const med of medications) {
    if (!med?.name) continue;
    const match = matchControlledSubstance(med.name);
    if (match) matches.push(match);
  }

  const warnings = matches.map(
    (m) =>
      `${m.medication} is a controlled substance (${SCHEDULE_LABEL[m.schedule]}); ` +
      `ensure statutory record-keeping and a valid in-person basis for prescribing.`,
  );

  return {
    hasControlledSubstance: matches.length > 0,
    matches,
    warnings,
  };
}

/**
 * Applies the NMC Telemedicine Practice Guidelines (2020): Schedule X drugs and
 * NDPS narcotics/psychotropics must NOT be prescribed via teleconsultation.
 * In-person prescriptions are permitted (the check still surfaces warnings for
 * record-keeping). Returns a blocking decision plus the underlying check.
 */
export function validateControlledSubstances(
  medications: Array<{ name: string; [key: string]: unknown }>,
  context: ControlledSubstanceContext,
): ControlledSubstanceValidation {
  const check = checkControlledSubstances(medications);

  if (context.isTeleconsultation && check.hasControlledSubstance) {
    const names = check.matches.map((m) => m.medication).join(", ");
    return {
      isBlocked: true,
      code: "CONTROLLED_SUBSTANCE_TELEMEDICINE_BLOCKED",
      message:
        `Cannot prescribe controlled substances via teleconsultation per NMC ` +
        `Telemedicine Practice Guidelines: ${names}. These require an in-person consultation.`,
      check,
    };
  }

  return { isBlocked: false, check };
}
