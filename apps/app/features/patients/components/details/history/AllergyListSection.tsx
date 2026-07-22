import { AlertTriangle, Plus } from "lucide-react";
import { Input } from "@workspace/ui/components/form/input";
import type { PatientAllergy, PatientWithMedicalHistory } from "@workspace/types";
import { AllergyBadge } from "./AllergyBadge";
import { AllergyEditDialog } from "./AllergyEditDialog";
import { HistoryAddRow, HistoryBlock, HistoryEmptyState } from "./HistoryBlock";

interface AllergyListSectionProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  newAllergy: string;
  onNewAllergyChange: (value: string) => void;
  onAddAllergy: () => void;
  onRemoveAllergy: (id: string) => void;
  editingAllergy: PatientAllergy | null;
  onEditAllergy: (allergy: PatientAllergy) => void;
  onUpdateAllergy: () => void;
  onCancelEditAllergy: () => void;
  onEditingAllergyChange: (allergy: PatientAllergy) => void;
}

export function AllergyListSection(props: AllergyListSectionProps) {
  const { patient, readOnly, newAllergy, onNewAllergyChange, onAddAllergy, onRemoveAllergy, editingAllergy, onEditAllergy, onUpdateAllergy, onCancelEditAllergy, onEditingAllergyChange } = props;
  const items = patient.patientAllergies ?? [];

  return (
    <>
      <HistoryBlock
        icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}
        title="Allergies"
        count={items.length}
        addRow={
          !readOnly ? (
            <HistoryAddRow
              disabled={!newAllergy.trim()}
              onAdd={onAddAllergy}
            >
              <div className="relative flex-1 min-w-[160px]">
                <Plus className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Add allergy"
                  value={newAllergy}
                  onChange={(e) => onNewAllergyChange(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </HistoryAddRow>
          ) : null
        }
      >
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {items.map((allergy) => (
              <AllergyBadge
                key={allergy.id}
                allergy={allergy}
                readOnly={readOnly}
                onEdit={onEditAllergy}
                onRemove={onRemoveAllergy}
              />
            ))}
          </div>
        ) : (
          <HistoryEmptyState message="NKA" tone="success" />
        )}
      </HistoryBlock>

      <AllergyEditDialog
        editingAllergy={editingAllergy}
        onCancel={onCancelEditAllergy}
        onSave={onUpdateAllergy}
        onChange={onEditingAllergyChange}
      />
    </>
  );
}
