export function calculateBMI(weight: number, height: number): number {
  if (weight <= 0 || height <= 0) {
    throw new Error("Weight and height must be positive numbers");
  }

  const heightInMeters = height / 100;

  const bmi = weight / Math.pow(heightInMeters, 2);

  return parseFloat(bmi.toFixed(1));
}

export function calculateQTc(qt: number, heartRate: number): number {
  if (qt <= 0 || heartRate <= 0) {
    throw new Error("QT interval and heart rate must be positive numbers");
  }

  const rrInterval = 60 / heartRate;

  const qtc = qt / Math.sqrt(rrInterval);

  return Math.round(qtc);
}

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

export type BMIStatus = "underweight" | "normal" | "overweight" | "obese";

export function getBMIStatus(bmi: number): BMIStatus {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}
