/**
 * Vital Signs Status Utilities
 *
 * Utilities for determining vital sign status (normal, elevated, low, critical)
 * based on standard clinical ranges.
 */

export type VitalStatusType = "normal" | "elevated" | "low" | "critical";

export type VitalType = "bp" | "pulse" | "temp" | "spo2" | "weight" | "height";

/**
 * Color mappings for vital sign statuses
 * Used for consistent UI representation across the application
 */
export const VITAL_STATUS_COLORS: Record<VitalStatusType, string> = {
  normal: "text-green-600",
  elevated: "text-orange-500",
  low: "text-blue-500",
  critical: "text-red-600 font-bold animate-pulse",
};

/**
 * Normal ranges for vital signs
 * Based on adult clinical standards
 */
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

/**
 * Determine vital sign status based on value and type
 *
 * @param type - Type of vital sign (bp, pulse, temp, spo2)
 * @param value - Vital sign value (can be string for blood pressure like "120/80")
 * @returns Status classification
 *
 * @example
 * ```typescript
 * getVitalStatus("bp", 150); // Returns "elevated"
 * getVitalStatus("pulse", 45); // Returns "critical"
 * getVitalStatus("temp", 98.6); // Returns "normal"
 * getVitalStatus("bp", "120/80"); // Returns "normal"
 * ```
 */
export function getVitalStatus(
  type: string,
  value: number | string | undefined,
): VitalStatusType {
  if (value === undefined) return "normal";

  // Extract numeric value from string (for blood pressure like "120/80")
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

/**
 * Check if a vital sign is abnormal (not normal)
 *
 * @param type - Type of vital sign
 * @param value - Vital sign value
 * @returns True if vital is abnormal
 */
export function isVitalAbnormal(
  type: string,
  value: number | string | undefined,
): boolean {
  return getVitalStatus(type, value) !== "normal";
}

/**
 * Get vital sign status with human-readable description
 *
 * @param type - Type of vital sign
 * @param value - Vital sign value
 * @returns Object with status and description
 */
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
