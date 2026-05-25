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

export function parseDiagnosis(raw: unknown): DiagnosisItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return parseDiagnosisArray(raw);
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parseDiagnosisArray(parsed);
    if (typeof parsed === "string" && parsed.trim()) {
      return [
        {
          id: "legacy-dx",
          condition: parsed,
          type: "provisional",
          status: "active",
        },
      ];
    }
  } catch {
    if (raw.trim()) {
      return [
        {
          id: "legacy-dx",
          condition: raw,
          type: "provisional",
          status: "active",
        },
      ];
    }
  }
  return [];
}
