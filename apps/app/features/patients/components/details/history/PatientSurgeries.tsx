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
        <Scissors className="h-4 w-4 text-info" />
        Surgical History
      </div>
      <div className="space-y-2 mb-3">
        {patient.surgicalHistory?.map((surgery) => (
          <div
            key={surgery.id}
            className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors group"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">
                {surgery.procedureName}
              </span>
              {surgery.procedureDate && (
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  {new Date(surgery.procedureDate).toLocaleDateString()}
                </span>
              )}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemoveSurgery(surgery.id!)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors duration-150"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {(!patient.surgicalHistory || patient.surgicalHistory.length === 0) && (
          <div className="w-full py-6 text-center border-2 border-dashed rounded-lg bg-muted/10">
            <span className="text-sm text-muted-foreground">
              No surgical history recorded
            </span>
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-2 items-start pt-2 border-t border-border/40">
          <div className="grid gap-2 flex-1">
            <div className="relative">
              <Scissors className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Procedure name"
                value={newSurgery}
                onChange={(e) => onNewSurgeryChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Input
            type="date"
            value={newSurgeryDate}
            onChange={(e) => onNewSurgeryDateChange(e.target.value)}
            className="w-36"
          />
          <Button
            type="button"
            onClick={onAddSurgery}
            disabled={!newSurgery.trim()}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
