import type { VitalSign } from "@workspace/types";
import { isVitalRangeKey } from "@/features/consultation/lib/consultation-vital-keys";

export const getVitalRanges = (age: number) => {
  if (age < 1) {
    return {
      heartRate: { min: 120, max: 160 },
      respiratoryRate: { min: 30, max: 60 },
      systolicBP: { min: 65, max: 85 },
      diastolicBP: { min: 45, max: 55 },
    };
  } else if (age < 12) {
    return {
      heartRate: { min: 70, max: 120 },
      respiratoryRate: { min: 20, max: 30 },
      systolicBP: { min: 90, max: 110 },
      diastolicBP: { min: 55, max: 70 },
    };
  } else {
    return {
      heartRate: { min: 60, max: 100 },
      respiratoryRate: { min: 12, max: 20 },
      systolicBP: { min: 90, max: 120 },
      diastolicBP: { min: 60, max: 80 },
    };
  }
};

export const isVitalNormal = (
  vital: string,
  value: number,
  age: number,
): boolean => {
  const ranges = getVitalRanges(age);
  const range = isVitalRangeKey(vital) ? ranges[vital] : undefined;
  if (!range) return true;
  return value >= range.min && value <= range.max;
};

export const requiresUrgentAttention = (vitals: VitalSign): boolean => {
  const bp = vitals.bloodPressure?.split("/");
  const systolic = bp?.[0] ? parseInt(bp[0]) : 0;
  const diastolic = bp?.[1] ? parseInt(bp[1]) : 0;

  return (
    systolic > 180 ||
    diastolic > 120 ||
    (vitals.spo2 !== undefined && vitals.spo2 < 90) ||
    (vitals.temperature !== undefined && vitals.temperature > 103)
  );
};

export const calculateBMIFromVitals = (vitals: VitalSign): number | null => {
  if (!vitals.weight || !vitals.height) return null;
  const heightInMeters = vitals.height / 100;
  return parseFloat((vitals.weight / heightInMeters ** 2).toFixed(1));
};

export type ConsultationCompletionInput = {
  chiefComplaint?: string | null;
  hasDiagnosis: boolean;
  hasVitals: boolean;
};

export const getConsultationCompletionMissingFields = (
  consultation: ConsultationCompletionInput,
): string[] => {
  const missing: string[] = [];
  if (!consultation.chiefComplaint?.trim()) {
    missing.push("Chief complaint");
  }
  if (!consultation.hasDiagnosis) {
    missing.push("Diagnosis");
  }
  if (!consultation.hasVitals) {
    missing.push("Vitals");
  }
  return missing;
};

export const canCompleteConsultation = (
  consultation: ConsultationCompletionInput,
): boolean => {
  return getConsultationCompletionMissingFields(consultation).length === 0;
};
