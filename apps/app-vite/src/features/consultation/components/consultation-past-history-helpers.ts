import type { PatientWithMedicalHistory } from "@workspace/types";

export interface HistorySummary {
  hasAny: boolean;
  parts: string[];
}

export function summariseHistory(
  patient?: PatientWithMedicalHistory,
): HistorySummary {
  if (!patient) return { hasAny: false, parts: [] };
  const parts: string[] = [];
  const conditions = patient.medicalConditions?.length ?? 0;
  const allergies = patient.patientAllergies?.length ?? 0;
  const surgeries = patient.surgicalHistory?.length ?? 0;
  const family = patient.familyHistory?.length ?? 0;
  if (conditions > 0)
    parts.push(`${conditions} condition${conditions > 1 ? "s" : ""}`);
  if (allergies > 0)
    parts.push(`${allergies} allerg${allergies > 1 ? "ies" : "y"}`);
  if (surgeries > 0) parts.push(`${surgeries} surgical`);
  if (family > 0) parts.push(`${family} family`);
  if (patient.socialHistory) parts.push("social");
  return { hasAny: parts.length > 0, parts };
}
