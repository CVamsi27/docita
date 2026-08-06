import type { DiagnosisItem } from "@/features/consultation/components/structured/diagnosis-input-types";
import { toRecord } from "./consultation-hydrate-utils";

export function isDiagnosisItem(value: unknown): value is DiagnosisItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = toRecord(value);
  return typeof row.condition === "string" || typeof row.id === "string";
}
