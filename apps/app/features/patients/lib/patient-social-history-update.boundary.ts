import type {
  CreatePatientSocialHistoryInput,
  PatientSocialHistory,
} from "@workspace/types";

// check-as-cast-density: allow-file — partial field update over optional social-history columns
export function buildSocialHistoryUpsertPayload(
  socialHistory: PatientSocialHistory | null | undefined,
  field: keyof PatientSocialHistory,
  value: string,
): CreatePatientSocialHistoryInput {
  return {
    smokingStatus: socialHistory?.smokingStatus,
    smokingPackYears: socialHistory?.smokingPackYears,
    smokingQuitDate: socialHistory?.smokingQuitDate,
    alcoholUse: socialHistory?.alcoholUse,
    alcoholFrequency: socialHistory?.alcoholFrequency,
    substanceUse: socialHistory?.substanceUse,
    occupation: socialHistory?.occupation,
    occupationalHazards: socialHistory?.occupationalHazards,
    exerciseFrequency: socialHistory?.exerciseFrequency,
    dietaryRestrictions: socialHistory?.dietaryRestrictions,
    notes: socialHistory?.notes,
    [field]: value,
  } as CreatePatientSocialHistoryInput;
}
