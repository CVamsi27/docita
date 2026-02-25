import { usePatient } from "../../hooks/usePatients";
import { getPatientDisplayName } from "../../rules/patientRules";
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

  const allergies = patient.allergies
    ? patient.allergies.split(",").map((a) => a.trim())
    : [];
  const patientName = getPatientDisplayName(patient);

  return (
    <PatientAllergyAlertUI allergies={allergies} patientName={patientName} />
  );
}

export { PatientAllergyAlertUI };
