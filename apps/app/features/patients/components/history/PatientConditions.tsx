import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Heart, Plus, X } from "lucide-react";
import { PatientWithMedicalHistory } from "@workspace/types";

interface PatientConditionsProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  newCondition: string;
  onNewConditionChange: (value: string) => void;
  onAddCondition: () => void;
  onRemoveCondition: (id: string) => void;
}

export function PatientConditions({
  patient,
  readOnly,
  newCondition,
  onNewConditionChange,
  onAddCondition,
  onRemoveCondition,
}: PatientConditionsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Heart className="h-4 w-4 text-primary" />
        Problem List
      </div>
      <div className="flex flex-wrap gap-2">
        {patient.medicalConditions?.map((condition) => (
          <Badge
            key={condition.id}
            variant="outline"
            className="pl-2 pr-1 py-1 h-7 bg-background hover:bg-muted/50 transition-colors flex items-center gap-2 border-primary/20"
          >
            <span className="font-medium">{condition.conditionName}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemoveCondition(condition.id!)}
                className="ml-1 hover:text-destructive transition-colors focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {(!patient.medicalConditions ||
          patient.medicalConditions.length === 0) && (
          <span className="text-sm text-muted-foreground italic">
            No active problems
          </span>
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-2 max-w-sm mt-1">
          <Input
            placeholder="Add problem..."
            value={newCondition}
            onChange={(e) => onNewConditionChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddCondition();
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onAddCondition}
            disabled={!newCondition.trim()}
            className="h-8"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
