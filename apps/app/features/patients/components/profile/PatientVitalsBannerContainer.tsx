import {
  calculateBMI,
  getBMIStatus,
  getLatestVitals,
} from "../../rules/vitalsRules";
import { PatientVitalsBannerUI } from "./PatientVitalsBannerUI";
import type { Appointment } from "@workspace/types";

interface PatientVitalsBannerContainerProps {
  appointments: Appointment[];
}

export function PatientVitalsBannerContainer({
  appointments,
}: PatientVitalsBannerContainerProps) {
  const latestVitals = getLatestVitals(appointments);

  if (!latestVitals) return null;

  const { vitals, date } = latestVitals;

  const bmi = calculateBMI(vitals.weight || 0, vitals.height || 0);
  const bmiStatus = getBMIStatus(bmi);

  return (
    <PatientVitalsBannerUI
      vitals={vitals}
      date={date}
      bmi={bmi !== null ? bmi.toString() : null}
      bmiStatus={bmiStatus}
    />
  );
}
