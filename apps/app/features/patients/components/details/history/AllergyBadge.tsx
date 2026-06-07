import { Badge } from "@workspace/ui/components/indicators/badge";
import { Pencil, X } from "lucide-react";
import type { PatientAllergy } from "@workspace/types";

interface AllergyBadgeProps {
  allergy: PatientAllergy;
  readOnly: boolean;
  onEdit: (allergy: PatientAllergy) => void;
  onRemove: (id: string) => void;
}

export function AllergyBadge({ allergy, readOnly, onEdit, onRemove }: AllergyBadgeProps) {
  return (
    <Badge
      key={allergy.id}
      variant="destructive"
      className="pl-2 pr-1 py-1.5 h-auto text-sm badge-danger flex items-center gap-2"
    >
      <span className="font-medium">{allergy.allergen}</span>
      {!readOnly && (
        <div className="flex items-center ml-1 border-l border-destructive/40 pl-1 gap-1">
          <button
            type="button"
            onClick={() => onEdit(allergy)}
            className="p-0.5 rounded-full hover:bg-destructive/20 transition-colors focus:outline-none"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => { if (allergy.id) onRemove(allergy.id); }}
            className="p-0.5 rounded-full hover:bg-destructive/20 transition-colors focus:outline-none"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </Badge>
  );
}
