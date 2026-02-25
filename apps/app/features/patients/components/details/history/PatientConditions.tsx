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
      <div className="flex flex-wrap gap-2 mb-3">
        {patient.medicalConditions?.map((condition) => (
          <Badge
            key={condition.id}
            variant="outline"
            className="pl-2 pr-1 py-1.5 h-auto text-sm bg-background hover:bg-muted/50 transition-colors flex items-center gap-2 border-primary/20"
          >
            <span className="font-medium">{condition.conditionName}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemoveCondition(condition.id!)}
                className="ml-1 p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </Badge>
        ))}
        {(!patient.medicalConditions ||
          patient.medicalConditions.length === 0) && (
          <div className="w-full py-6 text-center border-2 border-dashed rounded-lg bg-muted/10">
            <span className="text-sm text-muted-foreground">
              No medical conditions known.
            </span>
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-2 items-center pt-2 border-t border-border/40">
          <div className="relative flex-1">
            <Plus className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Add new condition (e.g. Hypertension)"
              value={newCondition}
              onChange={(e) => onNewConditionChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddCondition();
                }
              }}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            onClick={onAddCondition}
            disabled={!newCondition.trim()}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
