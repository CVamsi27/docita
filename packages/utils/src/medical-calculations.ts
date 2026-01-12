/**
 * Medical Calculations Utilities
 *
 * Collection of common medical calculation functions used across the application.
 * These calculations follow standard medical formulas and guidelines.
 */

/**
 * Calculate Body Mass Index (BMI)
 *
 * Formula: BMI = weight(kg) / (height(m))^2
 *
 * @param weight - Patient weight in kilograms
 * @param height - Patient height in centimeters
 * @returns BMI value rounded to 1 decimal place
 *
 * @example
 * ```typescript
 * const bmi = calculateBMI(70, 170); // Returns 24.2
 * ```
 */
export function calculateBMI(weight: number, height: number): number {
  if (weight <= 0 || height <= 0) {
    throw new Error("Weight and height must be positive numbers");
  }

  // Convert height from cm to meters
  const heightInMeters = height / 100;

  // Calculate BMI
  const bmi = weight / Math.pow(heightInMeters, 2);

  // Round to 1 decimal place
  return parseFloat(bmi.toFixed(1));
}

/**
 * Calculate QTc interval using Bazett's formula
 *
 * Formula: QTc = QT / √RR
 * where RR interval = 60 / heart rate
 *
 * @param qt - QT interval in milliseconds
 * @param heartRate - Heart rate in beats per minute
 * @returns QTc value rounded to nearest integer
 *
 * @example
 * ```typescript
 * const qtc = calculateQTc(400, 75); // Returns 446
 * ```
 */
export function calculateQTc(qt: number, heartRate: number): number {
  if (qt <= 0 || heartRate <= 0) {
    throw new Error("QT interval and heart rate must be positive numbers");
  }

  // Calculate RR interval in seconds
  const rrInterval = 60 / heartRate;

  // Calculate QTc using Bazett's formula
  const qtc = qt / Math.sqrt(rrInterval);

  // Round to nearest integer
  return Math.round(qtc);
}

/**
 * Get BMI category based on WHO classification
 *
 * @param bmi - Body Mass Index value
 * @returns BMI category string
 *
 * @example
 * ```typescript
 * getBMICategory(18.5); // Returns "Normal weight"
 * getBMICategory(32); // Returns "Obese Class I"
 * ```
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 16) return "Severe Thinness";
  if (bmi < 17) return "Moderate Thinness";
  if (bmi < 18.5) return "Mild Thinness";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese Class I";
  if (bmi < 40) return "Obese Class II";
  return "Obese Class III";
}
