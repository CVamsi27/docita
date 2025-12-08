import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

export const QUICK_CONDITIONS = [
  { id: "none", label: "No Significant History" },
  { id: "hypertension", label: "Hypertension" },
  { id: "diabetes2", label: "Diabetes Type 2" },
  { id: "asthma", label: "Asthma" },
  { id: "copd", label: "COPD" },
  { id: "ibs", label: "IBS" },
  { id: "migraine", label: "Migraine" },
  { id: "anxiety", label: "Anxiety" },
  { id: "depression", label: "Depression" },
  { id: "arthritis", label: "Arthritis" },
  { id: "eczema", label: "Eczema" },
  { id: "allergies", label: "Allergies" },
];

interface QuickConditionsProps {
  selectedConditions?: string[];
  onSelect?: (conditionId: string) => void;
  variant?: "badge" | "button";
  className?: string;
}

export function QuickConditions({
  selectedConditions = [],
  onSelect,
  variant = "button",
  className = "",
}: QuickConditionsProps) {
  if (variant === "badge") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {selectedConditions.map((id) => {
          const condition = QUICK_CONDITIONS.find((c) => c.id === id);
          return condition ? (
            <Badge key={id} variant="secondary">
              {condition.label}
            </Badge>
          ) : null;
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {QUICK_CONDITIONS.map((condition) => (
        <Button
          key={condition.id}
          type="button"
          variant={
            selectedConditions.includes(condition.id) ? "default" : "outline"
          }
          size="sm"
          onClick={() => onSelect?.(condition.id)}
          className="text-xs"
        >
          {condition.label}
        </Button>
      ))}
    </div>
  );
}

export function QuickConditionsList({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm font-medium">Common Conditions</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_CONDITIONS.map((condition) => (
          <Badge
            key={condition.id}
            variant="outline"
            className="cursor-pointer"
          >
            {condition.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
