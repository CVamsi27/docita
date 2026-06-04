import type { DiagnosisItem } from "@/features/consultation/components/structured/DiagnosisInput";
import { toRecord } from "./consultation-hydrate-utils";

function isDiagnosisItem(value: unknown): value is DiagnosisItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const row = toRecord(value);
  return (
    typeof row.condition === "string" || typeof row.id === "string"
  );
}

function parseDiagnosisArray(values: unknown[]): DiagnosisItem[] {
  return values.filter(isDiagnosisItem);
}

function legacyDiagnosis(condition: string): DiagnosisItem[] {
  return condition.trim()
    ? [
        {
          id: "legacy-dx",
          condition,
          type: "provisional",
          status: "active",
        },
      ]
    : [];
}

function parseDiagnosisJson(raw: string): DiagnosisItem[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parseDiagnosisArray(parsed);
    return typeof parsed === "string" ? legacyDiagnosis(parsed) : [];
  } catch {
    return null;
  }
}

export function parseDiagnosis(raw: unknown): DiagnosisItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return parseDiagnosisArray(raw);
  if (typeof raw !== "string") return [];
  return parseDiagnosisJson(raw) ?? legacyDiagnosis(raw);
}
