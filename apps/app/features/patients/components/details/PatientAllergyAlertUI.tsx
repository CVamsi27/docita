import { AllergyBanner } from "@workspace/ui/components/feedback/allergy-banner";
import { useTranslations } from "next-intl";

interface PatientAllergyAlertUIProps {
  allergies: string[];
  patientName: string;
}

export function PatientAllergyAlertUI({
  allergies,
  patientName,
}: PatientAllergyAlertUIProps) {
  const t = useTranslations("Patients.allergyBanner");
  return (
    <AllergyBanner
      allergies={allergies}
      patientName={patientName}
      title={t("titleWithName", { name: patientName })}
      severeTitle={t("severeTitle")}
      allergiesTitle={t("allergiesTitle")}
      className="mb-4"
    />
  );
}
