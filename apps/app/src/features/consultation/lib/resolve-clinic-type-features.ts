import {
  CLINIC_TYPE_FEATURES,
  clinicTypeSchema,
  type ClinicType,
  type ClinicTypeFeatures,
} from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

export function resolveClinicTypeFeatures(clinicType?: string | null): {
  key: ClinicType;
  features: ClinicTypeFeatures;
} {
  const normalized = clinicType?.toUpperCase() ?? "GENERAL";
  const parsed = parseStringEnumMember(clinicTypeSchema.options, normalized);
  const key: ClinicType = parsed ?? "GENERAL";
  return {
    key,
    features: CLINIC_TYPE_FEATURES[key] ?? CLINIC_TYPE_FEATURES.GENERAL,
  };
}
