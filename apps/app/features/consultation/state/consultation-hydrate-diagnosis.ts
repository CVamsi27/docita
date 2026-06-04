import type { DiagnosisItem } from "@/features/consultation/components/structured/DiagnosisInput";
import {
  parseDiagnosisArray,
  parseDiagnosisJson,
} from "./consultation-diagnosis-json";
import { legacyDiagnosis } from "./consultation-diagnosis-legacy";

export function parseDiagnosis(raw: unknown): DiagnosisItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return parseDiagnosisArray(raw);
  if (typeof raw !== "string") return [];
  return parseDiagnosisJson(raw) ?? legacyDiagnosis(raw);
}
