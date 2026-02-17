import type { VitalSignValidation } from "@workspace/types";

export const VITAL_SIGNS_RANGES = {
  bloodPressureSystolic: { min: 70, max: 200, unit: "mmHg" },
  bloodPressureDiastolic: { min: 40, max: 130, unit: "mmHg" },
  heartRate: { min: 30, max: 200, unit: "bpm" },
  temperature: { min: 32, max: 43, unit: "°C" },
  spO2: { min: 0, max: 100, unit: "%" },
  respiratoryRate: { min: 5, max: 50, unit: "breaths/min" },
  glucose: { min: 20, max: 600, unit: "mg/dL" },
  weight: { min: 10, max: 500, unit: "kg" },
  height: { min: 50, max: 250, unit: "cm" },
};

export const VITAL_SIGNS_NORMAL_RANGES = {
  bloodPressureSystolic: { min: 90, max: 120, category: "normal" },
  bloodPressureDiastolic: { min: 60, max: 80, category: "normal" },
  heartRate: { min: 60, max: 100, category: "normal" },
  temperature: { min: 36.5, max: 37.5, category: "normal" },
  spO2: { min: 95, max: 100, category: "normal" },
  respiratoryRate: { min: 12, max: 20, category: "normal" },
  glucose: { min: 70, max: 100, category: "fasting" },
};

export function validateVitalSign(
  sign:
    | "bp_systolic"
    | "bp_diastolic"
    | "hr"
    | "temp"
    | "spo2"
    | "rr"
    | "glucose",
  value: number,
): VitalSignValidation {
  const ranges = VITAL_SIGNS_RANGES as Record<
    string,
    { min: number; max: number }
  >;
  const normalRanges = VITAL_SIGNS_NORMAL_RANGES as Record<
    string,
    { min: number; max: number; category: string }
  >;

  let rangeKey = "";
  let normalKey = "";

  switch (sign) {
    case "bp_systolic":
      rangeKey = "bloodPressureSystolic";
      normalKey = "bloodPressureSystolic";
      break;
    case "bp_diastolic":
      rangeKey = "bloodPressureDiastolic";
      normalKey = "bloodPressureDiastolic";
      break;
    case "hr":
      rangeKey = "heartRate";
      normalKey = "heartRate";
      break;
    case "temp":
      rangeKey = "temperature";
      normalKey = "temperature";
      break;
    case "spo2":
      rangeKey = "spO2";
      normalKey = "spO2";
      break;
    case "rr":
      rangeKey = "respiratoryRate";
      normalKey = "respiratoryRate";
      break;
    case "glucose":
      rangeKey = "glucose";
      normalKey = "glucose";
      break;
  }

  const range = ranges[rangeKey];
  const normal = normalRanges[normalKey];

  if (!range || !normal) {
    return { value, isValid: true, isNormal: true };
  }

  const isValid = value >= range.min && value <= range.max;
  const isNormal = value >= normal.min && value <= normal.max;

  if (!isValid) {
    return {
      value,
      isValid: false,
      isNormal: false,
      severity: "critical",
      message: `${sign.toUpperCase()} out of acceptable range (${range.min}-${range.max})`,
      suggestion: `Normal range: ${normal.min}-${normal.max}. Please verify measurement.`,
    };
  }

  if (!isNormal) {
    const severity = sign === "spo2" && value < 90 ? "critical" : "warning";
    return {
      value,
      isValid: true,
      isNormal: false,
      severity,
      message: `${sign.toUpperCase()} outside normal range (${normal.min}-${normal.max})`,
      suggestion: `Current: ${value}. Consider clinical follow-up if pattern continues.`,
    };
  }

  return { value, isValid: true, isNormal: true };
}
