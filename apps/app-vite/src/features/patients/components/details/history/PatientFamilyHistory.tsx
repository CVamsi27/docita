// jscpd:ignore-start — Family + surgery history blocks share the same HistoryBlock
// shell (title + add-row + ul-of-list-items + remove-button per item). The
// per-condition/surgery rendering differs (chips vs row with date), so the
// list-item loop is the only block excluded by the inner marker.
import { Input, SymbolTooltip } from "@workspace/ui/components";
import { Button } from "@workspace/ui/components/form/button";
import { useTranslation } from "react-i18next";
import { Users, X } from "lucide-react";
import { PatientWithMedicalHistory } from "@workspace/types";
import { HistoryAddRow, HistoryBlock, HistoryEmptyState } from "./HistoryBlock";

interface PatientFamilyHistoryProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  isCompact?: boolean;
  newFamilyCondition: string;
  newFamilyRelation: string;
  onNewFamilyConditionChange: (value: string) => void;
  onNewFamilyRelationChange: (value: string) => void;
  onAddFamilyHistory: () => void;
  onRemoveFamilyHistory: (id: string) => void;
}

export function PatientFamilyHistory({
  patient,
  readOnly,
  newFamilyCondition,
  newFamilyRelation,
  onNewFamilyConditionChange,
  onNewFamilyRelationChange,
  onAddFamilyHistory,
  onRemoveFamilyHistory,
}: PatientFamilyHistoryProps) {
  const { t } = useTranslation("Patients");
  const items = patient.familyHistory ?? [];
  return (
    <HistoryBlock
      icon={<Users className="h-3.5 w-3.5 text-primary" />}
      title={t("medicalHistory.familyHistory.title")}
      count={items.length}
      addRow={
        !readOnly ? (
          <HistoryAddRow
            disabled={
              !newFamilyCondition.trim() || !newFamilyRelation.trim()
            }
            onAdd={onAddFamilyHistory}
          >
            <div className="relative flex-1 min-w-[140px]">
              <Users className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("medicalHistory.familyHistory.conditionPlaceholder")}
                value={newFamilyCondition}
                onChange={(e) => onNewFamilyConditionChange(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Input
              placeholder={t("medicalHistory.familyHistory.relationshipPlaceholder")}
              value={newFamilyRelation}
              onChange={(e) => onNewFamilyRelationChange(e.target.value)}
              className="h-9 w-32 sm:w-36"
            />
          </HistoryAddRow>
        ) : null
      }
    >
      {items.length > 0 ? (
        // jscpd:ignore-start
        <ul className="space-y-1.5">
          {items.map((history) => (
            <li
              key={history.id}
              className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-medium text-foreground">
                  {history.condition}
                </span>
                <span className="w-fit rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {history.relationship}
                </span>
              </div>
              {!readOnly ? (
                <SymbolTooltip label={t("medicalHistory.familyHistory.removeAria")}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (history.id) onRemoveFamilyHistory(history.id);
                    }}
                    className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                    aria-label={t("medicalHistory.familyHistory.removeAria")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </SymbolTooltip>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <HistoryEmptyState message={t("medicalHistory.familyHistory.empty")} />
      )}
    </HistoryBlock>
  );
}
// jscpd:ignore-end
