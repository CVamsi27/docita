import { AllergyBanner } from "@workspace/ui/components/feedback/allergy-banner";
import type { Allergy } from "@/features/consultation/components/patient-summary.types";

export function AllergyAlertUI({
  allergies,
  className,
}: {
  allergies: Allergy[];
  className?: string;
}) {
  return <AllergyBanner allergies={allergies} className={className} />;
}
