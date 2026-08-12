import type { DiagnosisItem } from "@/features/consultation/components/structured/diagnosis-input-types";

export function legacyDiagnosis(condition: string): DiagnosisItem[] {
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
