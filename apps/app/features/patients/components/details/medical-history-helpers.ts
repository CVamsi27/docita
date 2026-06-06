import { patientSocialHistorySchema, type PatientSocialHistory, type PatientWithMedicalHistory } from "@workspace/types";

export function buildDisplayPatient(
  sourcePatient: PatientWithMedicalHistory,
  socialOverrides: Partial<PatientSocialHistory>,
  customDataOverrides: Record<string, unknown>,
): PatientWithMedicalHistory {
  const bs = sourcePatient.socialHistory;
  const ms = Object.keys(socialOverrides).length > 0 || bs
    ? patientSocialHistorySchema.parse({ ...(bs ?? { patientId: sourcePatient.id || "" }), ...socialOverrides })
    : undefined;
  const bc = sourcePatient.customData && typeof sourcePatient.customData === "object" && !Array.isArray(sourcePatient.customData)
    ? Object.fromEntries(Object.entries(sourcePatient.customData)) : {};
  const mc: PatientWithMedicalHistory["customData"] = {
    ...bc,
    ...Object.fromEntries(Object.entries(customDataOverrides).filter(
      (e): e is [string, string | number | boolean | null] => {
        const v = e[1]; return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null;
      })),
  };
  return { ...sourcePatient, socialHistory: ms, customData: mc };
}
