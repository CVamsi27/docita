import { AlertTriangle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Allergy } from "@/features/consultation/components/PatientSummaryCardUI";

export function AllergyAlertUI({
  allergies,
  className,
}: {
  allergies: Allergy[];
  className?: string;
}) {
  const severeAllergies = allergies.filter((a) => a.severity === "severe");
  const otherAllergies = allergies.filter((a) => a.severity !== "severe");

  if (allergies.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        severeAllergies.length > 0
          ? "bg-destructive border border-destructive/30 text-destructive"
          : "bg-warning border border-warning/30 text-warning",
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-medium">Allergies: </span>
        {severeAllergies.length > 0 && (
          <span className="text-destructive">
            {severeAllergies.map((a) => a.allergen).join(", ")}
            {otherAllergies.length > 0 && ", "}
          </span>
        )}
        {otherAllergies.map((a) => a.allergen).join(", ")}
      </div>
    </div>
  );
}
