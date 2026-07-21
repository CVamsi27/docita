import { DatePicker, Input, SymbolTooltip } from "@workspace/ui/components";
import { Scissors, X } from "lucide-react";
import { PatientWithMedicalHistory } from "@workspace/types";
import { formatDate } from "@/lib/formatters";
import { HistoryAddRow, HistoryBlock, HistoryEmptyState } from "./HistoryBlock";

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
  const items = patient.surgicalHistory ?? [];
  return (
    <HistoryBlock
      icon={<Scissors className="h-3.5 w-3.5 text-info" />}
      title="Surgical History"
      count={items.length}
      addRow={
        !readOnly ? (
          <HistoryAddRow
            disabled={!newSurgery.trim()}
            onAdd={onAddSurgery}
          >
            <div className="relative flex-1 min-w-[160px]">
              <Scissors className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Procedure name"
                value={newSurgery}
                onChange={(e) => onNewSurgeryChange(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <DatePicker
              value={newSurgeryDate || undefined}
              onChange={(date) =>
                onNewSurgeryDateChange(date?.toISOString().slice(0, 10) ?? "")
              }
              placeholder="Procedure date"
              className="w-44 h-9"
            />
          </HistoryAddRow>
        ) : null
      }
    >
      {items.length > 0 ? (
        // jscpd:ignore-start
        <ul className="space-y-1.5">
          {items.map((surgery) => (
            <li
              key={surgery.id}
              className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {surgery.procedureName}
                </span>
                {surgery.procedureDate ? (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(surgery.procedureDate)}
                  </span>
                ) : null}
              </div>
              {!readOnly ? (
                <SymbolTooltip label="Remove surgery">
                  <button
                    type="button"
                    onClick={() => {
                      if (surgery.id) onRemoveSurgery(surgery.id);
                    }}
                    className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                    aria-label="Remove surgery"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </SymbolTooltip>
              ) : null}
            </li>
          ))}
        </ul>
        // jscpd:ignore-end
      ) : (
        <HistoryEmptyState message="No surgical history recorded" />
      )}
    </HistoryBlock>
  );
}
