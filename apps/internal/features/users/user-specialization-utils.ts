import { SPECIALIZATION_LABELS } from "@workspace/types";

function isSpecializationLabelKey(
  key: string,
): key is keyof typeof SPECIALIZATION_LABELS {
  return key in SPECIALIZATION_LABELS;
}

export function getSpecializationLabel(
  specialization: string | undefined,
): string {
  if (!specialization) return "-";
  if (isSpecializationLabelKey(specialization)) {
    return SPECIALIZATION_LABELS[specialization];
  }
  return specialization;
}
