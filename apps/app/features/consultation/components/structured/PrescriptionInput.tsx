import React from "react";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives"
import { Button, SelectGroup, SelectLabel, SymbolTooltip } from "@workspace/ui/components";
import { Pill, Plus, Trash2 } from "lucide-react";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { MEDICATION_ROUTES } from "@/lib/services/clinic-feature.service";
import { SIG_CODE_LABELS } from "@workspace/types";

import { useMedicationSelection } from "./use-medication-selection";
import { useMedicationRoutes } from "./use-medication-routes";
import { usePrescriptionForm } from "./use-prescription-form";
import type { Medication } from "./prescription-input.types";

export type { Medication } from "./prescription-input.types";

/** Maps a stored sig-code (e.g. "BID") to its label, falling back to the raw value. */
function formatFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = SIG_CODE_LABELS;
  return labels[frequency] ?? frequency;
}

interface MedicationSelectFieldProps {
  readOnly: boolean;
  value: string;
  /** Human-readable label shown in the read-only fallback input. */
  readOnlyLabel: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  /** `SelectItem`/`SelectGroup` options rendered inside the dropdown. */
  children: React.ReactNode;
}

/**
 * A medication dropdown that falls back to a read-only input when the
 * prescription is locked. Shared by the Frequency and Route fields so the
 * read-only/select scaffolding lives in one place.
 */
function MedicationSelectField({
  readOnly,
  value,
  readOnlyLabel,
  placeholder,
  onValueChange,
  children,
}: MedicationSelectFieldProps) {
  if (readOnly) {
    return <Input value={readOnlyLabel} readOnly className="bg-background" />;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-background min-h-11 rounded-xl px-4">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

interface PrescriptionInputProps {
  value: Medication[];
  onChange: (medications: Medication[]) => void;
  readOnly?: boolean;
}

export function PrescriptionInput({
  value = [],
  onChange,
  readOnly = false,
}: PrescriptionInputProps) {
  const { groupedRoutes, defaultRoute } = useMedicationRoutes();
  const { medications, addMedication, updateMedication, removeMedication } =
    useMedicationSelection({ value, onChange, defaultRoute });
  const { fieldUpdaters } = usePrescriptionForm(updateMedication);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {medications.map((med, index) => {
          const {
            updateName,
            updateDosage,
            updateFrequency,
            updateDuration,
            updateRoute,
            updateInstructions,
          } = fieldUpdaters(index);

          return (
            <div
              key={index}
              className="space-y-2 rounded-[var(--radius-md)] border border-border/70 bg-muted/20 p-3 transition-colors duration-150 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CategoryAvatar
                    icon={<Pill />}
                    tone="primary"
                    size="sm"
                    aria-label="Medication"
                  />
                  <span className="text-sm font-medium">
                    Medication #{index + 1}
                  </span>
                </div>
                {!readOnly && (
                  <SymbolTooltip label="Remove medication">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeMedication(index)}
                      aria-label="Remove medication"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </SymbolTooltip>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="col-span-1 md:col-span-4">
                  <Input
                    placeholder="Medication name"
                    value={med.name}
                    onChange={(e) => updateName(e.target.value)}
                    readOnly={readOnly}
                    className="bg-background"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Input
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => updateDosage(e.target.value)}
                    readOnly={readOnly}
                    className="bg-background"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <MedicationSelectField
                    readOnly={readOnly}
                    value={med.frequency}
                    placeholder="Frequency"
                    readOnlyLabel={formatFrequencyLabel(med.frequency)}
                    onValueChange={updateFrequency}
                  >
                    {Object.entries(SIG_CODE_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {code} – {label}
                      </SelectItem>
                    ))}
                  </MedicationSelectField>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Input
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => updateDuration(e.target.value)}
                    readOnly={readOnly}
                    className="bg-background"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <MedicationSelectField
                    readOnly={readOnly}
                    value={med.route}
                    placeholder="Route"
                    readOnlyLabel={
                      MEDICATION_ROUTES.find((r) => r.value === med.route)
                        ?.label || med.route
                    }
                    onValueChange={updateRoute}
                  >
                    {Object.entries(groupedRoutes).map(([category, routes]) => (
                      <SelectGroup key={category}>
                        <SelectLabel>{category} Routes</SelectLabel>
                        {routes.map((route) => (
                          <SelectItem key={route.value} value={route.value}>
                            {route.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </MedicationSelectField>
                </div>
                <div className="col-span-1 md:col-span-12">
                  <Input
                    placeholder="Instructions"
                    value={med.instructions || ""}
                    onChange={(e) => updateInstructions(e.target.value)}
                    readOnly={readOnly}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <Button
          variant="outline"
          onClick={addMedication}
          className="w-full border-dashed py-3 text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add medication
        </Button>
      )}

      {medications.length === 0 && readOnly && (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-muted/10 px-6 py-10 text-center">
          <CategoryAvatar
            icon={<Pill />}
            tone="neutral"
            size="lg"
            aria-label="No medications"
            className="mx-auto mb-3"
          />
          <p className="font-medium text-foreground">No medications prescribed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No medicines have been added to this prescription yet.
          </p>
        </div>
      )}
    </div>
  );
}
