

export type VitalStatusType = "normal" | "elevated" | "low" | "critical";

export type VitalType = "bp" | "pulse" | "temp" | "spo2" | "weight" | "height";

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
  if (value === undefined) return "normal";

  const numValue =
    typeof value === "string"
      ? parseFloat(value.split("/")[0] || value)
      : value;

  if (isNaN(numValue)) return "normal";

  switch (type) {
    case "bp": {
      const range = VITAL_RANGES.bp;
      if (numValue >= range.critical.max) return "critical";
      if (numValue >= range.normal.max) return "elevated";
      if (numValue < range.normal.min) return "low";
      if (numValue < range.critical.min) return "critical";
      return "normal";
    }

    case "pulse": {
      const range = VITAL_RANGES.pulse;
      if (numValue > range.critical.max || numValue < range.critical.min) {
        return "critical";
      }
      if (numValue > range.normal.max) return "elevated";
      if (numValue < range.normal.min) return "low";
      return "normal";
    }

    case "temp": {
      const range = VITAL_RANGES.temp;
      if (numValue >= range.critical.max) return "critical";
      if (numValue >= range.normal.max) return "elevated";
      if (numValue < range.normal.min) return "low";
      if (numValue < range.critical.min) return "critical";
      return "normal";
    }

    case "spo2": {
      const range = VITAL_RANGES.spo2;
      if (numValue < range.critical.min) return "critical";
      if (numValue < range.normal.min) return "low";
      return "normal";
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
