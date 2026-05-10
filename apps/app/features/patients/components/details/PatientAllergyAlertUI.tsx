import { AllergyBanner } from "@workspace/ui/components/allergy-banner";

interface PatientAllergyAlertUIProps {
  allergies: string[];
  patientName: string;
}

export function PatientAllergyAlertUI({
  allergies,
  patientName,
}: PatientAllergyAlertUIProps) {
  return (
    <AllergyBanner
      allergies={allergies}
      patientName={patientName}
      className="mb-4"
    />
  );
}
