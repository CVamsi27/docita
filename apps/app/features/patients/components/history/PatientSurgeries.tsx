import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Scissors, X } from "lucide-react";
import { PatientWithMedicalHistory } from "@workspace/types";

interface PatientSurgeriesProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  newSurgery: string;
  newSurgeryDate: string;
  onNewSurgeryChange: (value: string) => void;
  onNewSurgeryDateChange: (value: string) => void;
  onAddSurgery: () => void;
  onRemoveSurgery: (id: string) => void;
}

export function PatientSurgeries({
  patient,
  readOnly,
  newSurgery,
  newSurgeryDate,
  onNewSurgeryChange,
  onNewSurgeryDateChange,
  onAddSurgery,
  onRemoveSurgery,
}: PatientSurgeriesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Scissors className="h-4 w-4 text-blue-500" />
        Surgical History
      </div>
      <div className="space-y-2">
        {patient.surgicalHistory?.map((surgery) => (
          <div
            key={surgery.id}
            className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm group"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{surgery.procedureName}</span>
              {surgery.procedureDate && (
                <span className="text-muted-foreground text-xs">
                  ({new Date(surgery.procedureDate).toLocaleDateString()})
                </span>
              )}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemoveSurgery(surgery.id!)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {(!patient.surgicalHistory || patient.surgicalHistory.length === 0) && (
          <span className="text-sm text-muted-foreground italic">
            No surgeries recorded
          </span>
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-2 items-center mt-1">
          <Input
            placeholder="Procedure name"
            value={newSurgery}
            onChange={(e) => onNewSurgeryChange(e.target.value)}
            className="h-8 text-sm flex-1"
          />
          <Input
            type="date"
            value={newSurgeryDate}
            onChange={(e) => onNewSurgeryDateChange(e.target.value)}
            className="h-8 text-sm w-32"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onAddSurgery}
            disabled={!newSurgery.trim()}
            className="h-8"
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
