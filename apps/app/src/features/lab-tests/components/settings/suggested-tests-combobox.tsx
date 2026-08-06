import { useState } from "react";
import { Lightbulb } from "lucide-react";
import type { LabTest } from "@workspace/types";
import { MicroLabel, SearchableSelect } from "@workspace/ui/components";

interface SuggestedTestsComboboxProps {
  catalog: LabTest[];
  /** Called when the user picks a suggestion — parent fills in the form fields. */
  onSelect: (test: LabTest) => void;
}

/**
 * Renders a read-only suggestion combobox when adding a new test.
 * Selecting an entry pre-fills the name, category, code, price, and
 * description fields in the parent form — the user can then customise.
 */
export function SuggestedTestsCombobox({
  catalog,
  onSelect,
}: SuggestedTestsComboboxProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  const options = catalog
    .filter((t) => t.active)
    .map((t) => ({
      value: t.id,
      label: t.name,
      description: t.category,
    }));

  const handleChange = (id: string) => {
    setSelectedId(id);
    const test = catalog.find((t) => t.id === id);
    if (test) onSelect(test);
  };

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border/70 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
        <MicroLabel>Suggest from existing catalog</MicroLabel>
      </div>
      <SearchableSelect
        options={options}
        value={selectedId}
        onValueChange={handleChange}
        placeholder="Pick a test to pre-fill fields…"
        searchPlaceholder="Search tests…"
        emptyMessage="No matching tests"
      />
      <p className="text-xs text-muted-foreground">
        Selecting a suggestion pre-fills the form. You can edit any field
        before saving.
      </p>
    </div>
  );
}
