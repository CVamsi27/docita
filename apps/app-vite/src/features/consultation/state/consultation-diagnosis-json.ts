import type { DiagnosisItem } from "@/features/consultation/components/structured/diagnosis-input-types";
import { isDiagnosisItem } from "./consultation-diagnosis-guards";
import { legacyDiagnosis } from "./consultation-diagnosis-legacy";

export function parseDiagnosisArray(values: unknown[]): DiagnosisItem[] {
  return values.filter(isDiagnosisItem);
}

export function parseDiagnosisJson(raw: string): DiagnosisItem[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parseDiagnosisArray(parsed);
    return typeof parsed === "string" ? legacyDiagnosis(parsed) : [];
  } catch {
    return null;
  }
}
