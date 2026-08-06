import { useTranslation } from "react-i18next";
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

/** Narrow a `Select` value (always `string`) to the allergy severity union without an `as` cast. */
function isAllergySeverity(value: string): value is (typeof allergySeverityValues)[number] {
  return allergySeverityValues.some((option) => option === value);
}

/** Narrow a `Select` value (always `string`) to the allergy type union without an `as` cast. */
function isAllergyType(value: string): value is (typeof allergyTypeValues)[number] {
  return allergyTypeValues.some((option) => option === value);
}

export function AllergyEditDialog({ editingAllergy, onCancel, onSave, onChange }: AllergyEditDialogProps) {
  const { t } = useTranslation("Allergy");
  return (
    <Dialog
      open={!!editingAllergy}
      onOpenChange={(open) => !open && onCancel()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>
            {t("editDescription")}
          </DialogDescription>
        </DialogHeader>
        {editingAllergy ? (
        <div className="flex flex-col gap-4 min-w-0">
          <div className="space-y-2">
            <Label>{t("allergenLabel")}</Label>
            <Input
              value={editingAllergy.allergen || ""}
              onChange={(e) =>
                onChange({ ...editingAllergy, allergen: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("severityLabel")}</Label>
            <Select
              value={editingAllergy.severity || "MODERATE"}
              onValueChange={(v: string) =>
                isAllergySeverity(v) && onChange({ ...editingAllergy, severity: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MILD">{t("severityMild")}</SelectItem>
                <SelectItem value="MODERATE">{t("severityModerate")}</SelectItem>
                <SelectItem value="SEVERE">{t("severitySevere")}</SelectItem>
                <SelectItem value="LIFE_THREATENING">{t("severityLifeThreatening")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("typeLabel")}</Label>
            <Select
              value={editingAllergy.allergyType || "DRUG"}
              onValueChange={(v: string) =>
                isAllergyType(v) && onChange({ ...editingAllergy, allergyType: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRUG">{t("typeDrug")}</SelectItem>
                <SelectItem value="FOOD">{t("typeFood")}</SelectItem>
                <SelectItem value="ENVIRONMENTAL">{t("typeEnvironmental")}</SelectItem>
                <SelectItem value="LATEX">{t("typeLatex")}</SelectItem>
                <SelectItem value="INSECT">{t("typeInsect")}</SelectItem>
                <SelectItem value="CONTRAST">{t("typeContrast")}</SelectItem>
                <SelectItem value="OTHER">{t("typeOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("reactionLabel")}</Label>
            <Input
              placeholder={t("reactionPlaceholder")}
              value={editingAllergy.reaction || ""}
              onChange={(e) =>
                onChange({ ...editingAllergy, reaction: e.target.value })
              }
            />
          </div>
        </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
          <Button onClick={onSave}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
