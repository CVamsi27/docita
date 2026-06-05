import { rangeVitalStatus, spo2VitalStatus } from "./vital-status-rules.js";
import type { VitalStatusType, VitalType } from "./vital-status-types.js";
import { parseVitalNumber } from "./vital-value.js";

export type { VitalStatusType, VitalType };

export const VITAL_STATUS_COLORS: Record<VitalStatusType, string> = {
  normal: "text-success",
  elevated: "text-warning",
  low: "text-info",
  critical: "text-destructive font-bold",
};

export const VITAL_RANGES = {
  bp: {
    normal: { min: 90, max: 140 },
    critical: { min: 60, max: 180 },
  },
  pulse: {
    normal: { min: 60, max: 100 },
    critical: { min: 50, max: 120 },
  },
  temp: {
    normal: { min: 97, max: 100.4 },
    critical: { min: 95, max: 103 },
  },
  spo2: {
    normal: { min: 95, max: 100 },
    critical: { min: 85, max: 100 },
  },
} as const;

export function getVitalStatus(
  type: string,
  value: number | string | undefined,
): VitalStatusType {
  const numValue = parseVitalNumber(value);
  if (numValue === null) return "normal";

  switch (type) {
    case "bp": {
      return rangeVitalStatus(numValue, VITAL_RANGES.bp);
    }

    case "pulse": {
      return rangeVitalStatus(numValue, VITAL_RANGES.pulse);
    }

    case "temp": {
      return rangeVitalStatus(numValue, VITAL_RANGES.temp);
    }

    case "spo2": {
      return spo2VitalStatus(numValue, VITAL_RANGES.spo2);
    }

    default:
      return "normal";
  }
}

export function isVitalAbnormal(
  type: string,
  value: number | string | undefined,
): boolean {
  return getVitalStatus(type, value) !== "normal";
}

export function getVitalStatusWithDescription(
  type: string,
  value: number | string | undefined,
): { status: VitalStatusType; description: string } {
  const status = getVitalStatus(type, value);

  const descriptions: Record<VitalStatusType, string> = {
    normal: "Within normal range",
    elevated: "Above normal range",
    low: "Below normal range",
    critical: "Critically abnormal - requires immediate attention",
  };

  return {
    status,
    description: descriptions[status],
  };
}
