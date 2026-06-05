import type { Appointment, VitalSign } from "@workspace/types";
import {
  calculateBMI as calculateSharedBMI,
  getBMIStatus as getSharedBMIStatus,
} from "@workspace/utils";

export interface VitalsData {
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  spo2?: number;
  respiratoryRate?: number;
  bmi?: number;
}

export interface VitalsWithDate {
  vitals: VitalSign;
  date: string;
}

export const getLatestVitals = (
  appointments: Appointment[],
): VitalsWithDate | null => {
  const sorted = [...appointments].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  const apt = sorted.find((a) => a.vitalSign);

  if (!apt || !apt.vitalSign) return null;

  return {
    vitals: apt.vitalSign,
    date:
      typeof apt.startTime === "string"
        ? apt.startTime
        : apt.startTime.toISOString(),
  };
};

export const calculateBMI = (weight: number, height: number): number | null => {
  if (!weight || !height || height === 0) return null;
  return calculateSharedBMI(weight, height);
};

export const getBMIStatus = (
  bmi: number | null,
): { label: string; color: string } | null => {
  if (bmi === null) return null;

  const status = getSharedBMIStatus(bmi);
  return {
    underweight: { label: "Underweight", color: "text-info" },
    normal: { label: "Normal", color: "text-success" },
    overweight: { label: "Overweight", color: "text-warning" },
    obese: { label: "Obese", color: "text-destructive" },
  }[status];
};

export const isBloodPressureNormal = (bp: string): boolean => {
  const match = bp.match(/(\d+)\/(\d+)/);
  if (!match) return false;

  const systolic = parseInt(match[1] || "0", 10);
  const diastolic = parseInt(match[2] || "0", 10);

  return (
    systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80
  );
};

export const isPulseNormal = (pulse: number): boolean => {
  return pulse >= 60 && pulse <= 100;
};

export const isTemperatureNormal = (tempF: number): boolean => {
  return tempF >= 97.8 && tempF <= 99.1;
};
