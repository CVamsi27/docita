import { AllergyBanner } from "@workspace/ui/components/feedback/allergy-banner";
import { useTranslations } from "next-intl";
import type { Allergy } from "@/features/consultation/components/patient-summary.types";

export function AllergyAlertUI({
  allergies,
  patientName,
  className,
}: {
  allergies: Allergy[];
  patientName?: string;
  className?: string;
}) {
  const t = useTranslations("Patients.allergyBanner");
  return (
    <AllergyBanner
      allergies={allergies}
      patientName={patientName}
      title={
        patientName
          ? t("titleWithName", { name: patientName })
          : undefined
      }
      severeTitle={t("severeTitle")}
      allergiesTitle={t("allergiesTitle")}
      className={className}
    />
  );
}
