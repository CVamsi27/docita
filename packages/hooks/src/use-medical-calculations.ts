import { useMemo } from "react";
import { calculateBMI, getBMICategory, getBMIStatus } from "@workspace/utils";

export function useMedicalCalculations(weight?: number, height?: number) {
  const bmi = useMemo(() => {
    if (!weight || !height) return undefined;
    try {
      return calculateBMI(weight, height);
    } catch {
      return undefined;
    }
  }, [weight, height]);

  const bmiCategory = useMemo(() => {
    if (bmi === undefined) return undefined;
    return getBMICategory(bmi);
  }, [bmi]);

  const bmiStatus = useMemo(():
    | "underweight"
    | "normal"
    | "overweight"
    | "obese"
    | undefined => {
    if (bmi === undefined) return undefined;
    return getBMIStatus(bmi);
  }, [bmi]);

  return {
    bmi,
    bmiCategory,
    bmiStatus,
  };
}
