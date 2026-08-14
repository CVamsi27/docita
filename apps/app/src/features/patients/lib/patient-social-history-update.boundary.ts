import type {
  CreatePatientSocialHistoryInput,
  PatientSocialHistory,
} from "@workspace/types";

// check-as-cast-density: allow-file — `CreatePatientSocialHistoryInput` is the
// zod-transform OUTPUT type (`z.string().optional().transform(stripHtmlTags)`
// infers `string`, not `string | undefined`), while an unset column flows as
// `undefined` through the optional input at runtime. The assertion documents
// that runtime contract; a cast-free literal would fail `string | undefined`
// vs `string` on every transformed field (verified via app check-types).
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
