import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PatientAllergy } from "@workspace/types";

interface AllergyBadgeProps {
  allergy: PatientAllergy;
  readOnly: boolean;
  onEdit: (allergy: PatientAllergy) => void;
  onRemove: (id: string) => void;
}

export function AllergyBadge({ allergy, readOnly, onEdit, onRemove }: AllergyBadgeProps) {
  const { t } = useTranslation("Patients");
  return (
    <Badge
      key={allergy.id}
      variant="destructive"
      className="pl-2 pr-1 py-1.5 h-auto text-sm badge-danger flex items-center gap-2"
    >
      <span className="font-medium">{allergy.allergen}</span>
      {!readOnly && (
        <div className="flex items-center ml-1 border-l border-destructive/40 pl-1 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(allergy)}
            aria-label={t("allergyBadge.editAria", { name: allergy.allergen ?? "" })}
            className="p-0.5 rounded-full hover:bg-destructive/20"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { if (allergy.id) onRemove(allergy.id); }}
            aria-label={t("allergyBadge.removeAria", { name: allergy.allergen ?? "" })}
            className="p-0.5 rounded-full hover:bg-destructive/20"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Badge>
  );
}
