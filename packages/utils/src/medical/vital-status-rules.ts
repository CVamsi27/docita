import type { VitalStatusType } from "./vital-status-types.js";

export function rangeVitalStatus(
  value: number,
  range: {
    normal: { min: number; max: number };
    critical: { min: number; max: number };
  },
): VitalStatusType {
  if (value >= range.critical.max || value < range.critical.min) {
    return "critical";
  }
  if (value >= range.normal.max) return "elevated";
  if (value < range.normal.min) return "low";
  return "normal";
}

export function spo2VitalStatus(
  value: number,
  range: { normal: { min: number }; critical: { min: number } },
): VitalStatusType {
  if (value < range.critical.min) return "critical";
  if (value < range.normal.min) return "low";
  return "normal";
}
