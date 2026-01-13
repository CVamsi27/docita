import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { AlertTriangle, Pencil, Plus, X } from "lucide-react";
import { PatientAllergy, PatientWithMedicalHistory } from "@workspace/types";

interface PatientAllergiesProps {
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

export function PatientAllergies({
  patient,
  readOnly,
  newAllergy,
  onNewAllergyChange,
  onAddAllergy,
  onRemoveAllergy,
  editingAllergy,
  onEditAllergy,
  onUpdateAllergy,
  onCancelEditAllergy,
  onEditingAllergyChange,
}: PatientAllergiesProps) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Allergies
        </div>
        <div className="flex flex-wrap gap-2">
          {patient.patientAllergies?.map((allergy) => (
            <Badge
              key={allergy.id}
              variant="destructive"
              className="pl-2 pr-1 py-1 h-7 bg-red-100 text-red-800 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 flex items-center gap-2"
            >
              <span className="font-medium">{allergy.allergen}</span>
              {!readOnly && (
                <div className="flex items-center ml-1 border-l border-red-300 dark:border-red-700 pl-1 gap-1">
                  <button
                    type="button"
                    onClick={() => onEditAllergy(allergy)}
                    className="hover:text-red-950 dark:hover:text-red-100 transition-colors focus:outline-none"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveAllergy(allergy.id!)}
                    className="hover:text-red-950 dark:hover:text-red-100 transition-colors focus:outline-none"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </Badge>
          ))}
          {(!patient.patientAllergies ||
            patient.patientAllergies.length === 0) && (
            <span className="text-sm text-muted-foreground italic">
              NKA (No Known Allergies)
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex gap-2 max-w-sm mt-1">
            <Input
              placeholder="Add allergy..."
              value={newAllergy}
              onChange={(e) => onNewAllergyChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddAllergy();
                }
              }}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onAddAllergy}
              disabled={!newAllergy.trim()}
              className="h-8"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={!!editingAllergy}
        onOpenChange={(open) => !open && onCancelEditAllergy()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allergy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Allergen</Label>
              <Input
                value={editingAllergy?.allergen || ""}
                onChange={(e) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    allergen: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={editingAllergy?.severity || "MODERATE"}
                onValueChange={(v: string) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    severity: v as
                      | "MILD"
                      | "MODERATE"
                      | "SEVERE"
                      | "LIFE_THREATENING",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Mild</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="SEVERE">Severe</SelectItem>
                  <SelectItem value="LIFE_THREATENING">
                    Life-Threatening (Anaphylaxis Risk)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editingAllergy?.allergyType || "DRUG"}
                onValueChange={(v: string) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    allergyType: v as
                      | "DRUG"
                      | "FOOD"
                      | "ENVIRONMENTAL"
                      | "LATEX"
                      | "INSECT"
                      | "CONTRAST"
                      | "OTHER",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRUG">Drug/Medication</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="ENVIRONMENTAL">
                    Environmental (Pollen, Dust)
                  </SelectItem>
                  <SelectItem value="LATEX">Latex</SelectItem>
                  <SelectItem value="INSECT">Insect Stings/Bites</SelectItem>
                  <SelectItem value="CONTRAST">Contrast Dye</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reaction</Label>
              <Input
                placeholder="e.g., Anaphylaxis, Rash, Hives, Swelling"
                value={editingAllergy?.reaction || ""}
                onChange={(e) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    reaction: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelEditAllergy}>
              Cancel
            </Button>
            <Button onClick={onUpdateAllergy}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
