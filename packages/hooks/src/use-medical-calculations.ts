import { useMemo } from "react";
import { calculateBMI, getBMICategory } from "@workspace/utils";

/**
 * Medical calculations hook with memoization
 *
 * Automatically calculates medical values (BMI, etc.) from patient measurements
 * and memoizes the results to prevent unnecessary recalculations.
 *
 * @param weight - Patient weight in kilograms
 * @param height - Patient height in centimeters
 * @returns Object containing calculated medical values
 *
 * @example
 * ```typescript
 * const { bmi, bmiCategory, bmiStatus } = useMedicalCalculations(70, 170);
 * // bmi: 24.2
 * // bmiCategory: "Normal weight"
 * // bmiStatus: "normal"
 * ```
 */
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
    if (bmi < 18.5) return "underweight";
    if (bmi < 25) return "normal";
    if (bmi < 30) return "overweight";
    return "obese";
  }, [bmi]);

  return {
    bmi,
    bmiCategory,
    bmiStatus,
  };
}
