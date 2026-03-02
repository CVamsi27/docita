import { usePatient } from "@/features/patients/hooks/usePatients";
import { getPatientDisplayName } from "@/features/patients/rules/patientRules";
import { PatientAllergyAlertUI } from "./PatientAllergyAlertUI";

interface PatientAllergyAlertContainerProps {
  patientId: string;
}

export function PatientAllergyAlertContainer({
  patientId,
}: PatientAllergyAlertContainerProps) {
  const { data: patient, isLoading } = usePatient(patientId);

  if (isLoading || !patient) {
    return null;
  }

  const allergiesValue =
    "allergies" in patient && typeof patient.allergies === "string"
      ? patient.allergies
      : "";

  const allergies = allergiesValue
    ? allergiesValue
        .split(",")
        .map((allergy) => allergy.trim())
        .filter(Boolean)
    : [];
  const patientName = getPatientDisplayName(patient);

  return (
    <PatientAllergyAlertUI allergies={allergies} patientName={patientName} />
  );
}

export { PatientAllergyAlertUI };
