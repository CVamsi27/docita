import { AlertTriangle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Allergy } from "../PatientSummaryCardUI";

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
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-yellow-50 border border-yellow-200 text-yellow-800",
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-medium">Allergies: </span>
        {severeAllergies.length > 0 && (
          <span className="text-red-700">
            {severeAllergies.map((a) => a.allergen).join(", ")}
            {otherAllergies.length > 0 && ", "}
          </span>
        )}
        {otherAllergies.map((a) => a.allergen).join(", ")}
      </div>
    </div>
  );
}
