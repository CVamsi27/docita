"use client";

import React from "react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { Plus, RotateCcw, X } from "lucide-react";

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  prnInstructions: string;
}

interface MedicationCardProps {
  med: Medication;
  index: number;
  isOnlyMedication: boolean;
  onUpdate: (index: number, field: keyof Medication, value: string) => void;
  onRemove: (index: number) => void;
}

function MedicationCard({
  med,
  index,
  isOnlyMedication,
  onUpdate,
  onRemove,
}: MedicationCardProps) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/40 rounded-lg border border-border/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Medication #{index + 1}
        </span>
        {!isOnlyMedication && (
          <SymbolTooltip label="Remove medication">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(index)}
              aria-label="Remove medication"
            >
              <X className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            placeholder="Medication name"
            value={med.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
          />
        </div>
        <Input
          placeholder="Dosage"
          value={med.dosage}
          onChange={(e) => onUpdate(index, "dosage", e.target.value)}
        />
        <Input
          placeholder="Frequency"
          value={med.frequency}
          onChange={(e) => onUpdate(index, "frequency", e.target.value)}
        />
        <Input
          placeholder="Duration"
          value={med.duration}
          onChange={(e) => onUpdate(index, "duration", e.target.value)}
        />
        <Input
          placeholder="Route"
          value={med.route}
          onChange={(e) => onUpdate(index, "route", e.target.value)}
        />
      </div>
    </div>
  );
}

interface MedicationsSectionProps {
  medications: Medication[];
  hasLastRx: boolean;
  onRepeatLastRx: () => void;
  onAdd: () => void;
  onUpdate: (index: number, field: keyof Medication, value: string) => void;
  onRemove: (index: number) => void;
}

export function MedicationsSection({
  medications,
  hasLastRx,
  onRepeatLastRx,
  onAdd,
  onUpdate,
  onRemove,
}: MedicationsSectionProps) {
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onRepeatLastRx}
          disabled={!hasLastRx}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Repeat Last Rx
        </Button>
      </div>

      {medications.map((med, index) => (
        <MedicationCard
          key={index}
          med={med}
          index={index}
          isOnlyMedication={medications.length === 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}

      <Button
        variant="outline"
        onClick={onAdd}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Another Medication
      </Button>
    </div>
  );
}
