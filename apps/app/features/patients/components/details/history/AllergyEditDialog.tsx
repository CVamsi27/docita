import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import type { PatientAllergy } from "@workspace/types";

interface AllergyEditDialogProps {
  editingAllergy: PatientAllergy | null;
  onCancel: () => void;
  onSave: () => void;
  onChange: (allergy: PatientAllergy) => void;
}

const allergySeverityValues = ["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING"] as const;
const allergyTypeValues = ["DRUG", "FOOD", "ENVIRONMENTAL", "LATEX", "INSECT", "CONTRAST", "OTHER"] as const;

export function AllergyEditDialog({ editingAllergy, onCancel, onSave, onChange }: AllergyEditDialogProps) {
  return (
    <Dialog
      open={!!editingAllergy}
      onOpenChange={(open) => !open && onCancel()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit allergy</DialogTitle>
          <DialogDescription>
            Update the allergen, severity, type, and reaction.
          </DialogDescription>
        </DialogHeader>
        {editingAllergy ? (
        <div className="flex flex-col gap-4 min-w-0">
          <div className="space-y-2">
            <Label>Allergen</Label>
            <Input
              value={editingAllergy.allergen || ""}
              onChange={(e) =>
                onChange({ ...editingAllergy, allergen: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select
              value={editingAllergy.severity || "MODERATE"}
              onValueChange={(v: string) =>
                onChange({ ...editingAllergy, severity: v as (typeof allergySeverityValues)[number] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MILD">Mild</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="SEVERE">Severe</SelectItem>
                <SelectItem value="LIFE_THREATENING">Life-Threatening (Anaphylaxis Risk)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={editingAllergy.allergyType || "DRUG"}
              onValueChange={(v: string) =>
                onChange({ ...editingAllergy, allergyType: v as (typeof allergyTypeValues)[number] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRUG">Drug/medication</SelectItem>
                <SelectItem value="FOOD">Food</SelectItem>
                <SelectItem value="ENVIRONMENTAL">Environmental (pollen, dust)</SelectItem>
                <SelectItem value="LATEX">Latex</SelectItem>
                <SelectItem value="INSECT">Insect stings/bites</SelectItem>
                <SelectItem value="CONTRAST">Contrast dye</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reaction</Label>
            <Input
              placeholder="Reaction"
              value={editingAllergy.reaction || ""}
              onChange={(e) =>
                onChange({ ...editingAllergy, reaction: e.target.value })
              }
            />
          </div>
        </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
