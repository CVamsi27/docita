/**
 * Single source of truth for building a patient's display name from parts.
 * Use this instead of inline `${firstName} ${lastName}` so trimming, missing
 * parts, and the empty fallback behave identically everywhere (UI, PDFs,
 * search, FHIR, reminders).
 */
export interface PatientNameParts {
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}

export function getPatientFullName(
  patient: PatientNameParts | null | undefined,
  fallback = "",
): string {
  if (!patient) return fallback;
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
  return name || fallback;
}
