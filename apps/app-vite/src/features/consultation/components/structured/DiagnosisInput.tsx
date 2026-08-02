import { Button } from "@workspace/ui/components/form/button";
import { Plus, Stethoscope } from "lucide-react";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { Feature } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { DiagnosisItemRow } from "./diagnosis-item-row";
import type {
  DiagnosisInputProps,
  DiagnosisItem,
} from "./diagnosis-input-types";

export type {
  DiagnosisItem,
  DiagnosisInputProps,
} from "./diagnosis-input-types";

export function DiagnosisInput({
  value = [],
  onChange,
  readOnly = false,
}: DiagnosisInputProps) {
  const medicalCodingEnabled = usePermissionStore((s) =>
    s.canAccess(Feature.MEDICAL_CODING),
  );
  const items = value.length > 0 ? value : [];
  const addItem = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        condition: "",
        type: "provisional",
        status: "active",
        notes: "",
      },
    ]);
  };
  const updateItem = (
    index: number,
    field: keyof DiagnosisItem,
    fieldValue: string,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: fieldValue };
    onChange(newItems);
  };
  const setIcdCode = (index: number, code: DiagnosisItem["icdCode"]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], icdCode: code };
    onChange(newItems);
  };
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item, index) => (
          <DiagnosisItemRow
            key={item.id || index}
            item={item}
            index={index}
            readOnly={readOnly}
            medicalCodingEnabled={medicalCodingEnabled}
            onUpdate={(field, fieldValue) =>
              updateItem(index, field, fieldValue)
            }
            onSetIcdCode={(code) => setIcdCode(index, code)}
            onRemove={() => removeItem(index)}
          />
        ))}
      </div>
      {!readOnly ? (
        <Button
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed py-3 text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add diagnosis
        </Button>
      ) : null}
      {items.length === 0 && readOnly ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-muted/10 px-6 py-10 text-center">
          <CategoryAvatar
            icon={<Stethoscope />}
            tone="neutral"
            size="lg"
            aria-label="No diagnosis"
            className="mx-auto mb-3"
          />
          <p className="font-medium text-foreground">No diagnosis recorded</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This consultation does not have a documented diagnosis yet.
          </p>
        </div>
      ) : null}
    </div>
  );
}
