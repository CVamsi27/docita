import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import type { PatientAllergy, PatientWithMedicalHistory } from "@workspace/types";
import { AllergyBadge } from "./AllergyBadge";
// jscpd:ignore-start
import { AllergyEditDialog } from "./AllergyEditDialog";

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

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Allergies
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {patient.patientAllergies?.map((allergy) => (
            <AllergyBadge
              key={allergy.id}
              allergy={allergy}
              readOnly={readOnly}
              onEdit={onEditAllergy}
              onRemove={onRemoveAllergy}
            />
          ))}
          {(!patient.patientAllergies || patient.patientAllergies.length === 0) && (
            <div className="w-full py-6 text-center border-2 border-dashed rounded-lg surface-success">
              <span className="text-sm font-medium flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                No known allergies
              </span>
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="flex gap-2 items-center pt-2 border-t border-border/40">
            <div className="relative flex-1">
              <Plus className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Allergy name"
                value={newAllergy}
                onChange={(e) => onNewAllergyChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddAllergy();
                  }
                }}
                className="pl-9"
              />
            </div>
            <Button type="button" onClick={onAddAllergy} disabled={!newAllergy.trim()}>
              Add
            </Button>
          </div>
        )}
      </div>

      <AllergyEditDialog
        editingAllergy={editingAllergy}
        onCancel={onCancelEditAllergy}
        onSave={onUpdateAllergy}
        onChange={onEditingAllergyChange}
      />
    </>
  );
}
