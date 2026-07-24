import { Input } from "@workspace/ui/components/form/input";
import { Heart, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PatientWithMedicalHistory } from "@workspace/types";
import { HistoryAddRow, HistoryBlock, HistoryEmptyState } from "./HistoryBlock";

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
  const t = useTranslations("Patients.medicalHistory.conditions");
  const items = patient.medicalConditions ?? [];
  return (
    <HistoryBlock
      icon={<Heart className="h-3.5 w-3.5 text-primary" />}
      title={t("title")}
      count={items.length}
      addRow={
        !readOnly ? (
          <HistoryAddRow
            disabled={!newCondition.trim()}
            onAdd={onAddCondition}
          >
            <div className="relative flex-1 min-w-[160px]">
              <Plus className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("addPlaceholder")}
                value={newCondition}
                onChange={(e) => onNewConditionChange(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </HistoryAddRow>
        ) : null
      }
    >
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((condition) => (
            <li
              key={condition.id}
              className="group flex items-center gap-1.5 rounded-md border border-primary/20 bg-background px-2 py-1 text-xs transition-colors hover:bg-muted/50"
            >
              <span className="font-medium text-foreground">
                {condition.conditionName}
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => {
                    if (condition.id) onRemoveCondition(condition.id);
                  }}
                  className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                  aria-label={t("removeAria", { name: condition.conditionName ?? "" })}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <HistoryEmptyState message={t("empty")} />
      )}
    </HistoryBlock>
  );
}
