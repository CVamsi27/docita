import { AllergyBanner } from "@workspace/ui/components/feedback/allergy-banner";
import { Allergy } from "@/features/consultation/components/PatientSummaryCardUI";

export function AllergyAlertUI({
  allergies,
  className,
}: {
  allergies: Allergy[];
  className?: string;
}) {
  return <AllergyBanner allergies={allergies} className={className} />;
}
