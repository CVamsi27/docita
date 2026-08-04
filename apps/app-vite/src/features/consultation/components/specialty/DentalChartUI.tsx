import { useState } from "react";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { useConstants } from "@workspace/data-access";
import type { DentalChartData } from "@workspace/types";
import { DentalToothGrid, DentalToothEditor } from "./DentalChartSections";

type DentalChartValue = DentalChartData;

interface DentalChartUIProps {
  value: DentalChartValue;
  onChange: (value: DentalChartValue) => void;
  readOnly?: boolean;
}

export function DentalChartUI({
  value,
  onChange,
  readOnly,
}: DentalChartUIProps) {
  const { data: constants, isLoading } = useConstants();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  if (isLoading || !constants) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading dental chart">
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  const { teethQuadrants: TEETH_QUADRANTS, toothConditions: TOOTH_CONDITIONS } =
    constants;

  const handleToothClick = (toothId: number) => {
    if (readOnly) return;
    setSelectedTooth(toothId);
  };

  const updateToothCondition = (toothId: number, condition: string) => {
    const current = value?.[toothId] || { condition: "HEALTHY", notes: "" };
    onChange({ ...value, [toothId]: { ...current, condition } });
  };

  const updateToothNotes = (toothId: number, notes: string) => {
    const current = value?.[toothId] || { condition: "HEALTHY", notes: "" };
    onChange({ ...value, [toothId]: { ...current, notes } });
  };

  return (
    <div className="space-y-6">
      <DentalToothGrid
        quadrants={TEETH_QUADRANTS}
        toothData={value || {}}
        conditions={TOOTH_CONDITIONS}
        selectedTooth={selectedTooth}
        readOnly={readOnly}
        onToothClick={handleToothClick}
      />

      {!readOnly && selectedTooth !== null && (
        <DentalToothEditor
          selectedTooth={selectedTooth}
          toothData={value || {}}
          conditions={TOOTH_CONDITIONS}
          onConditionChange={updateToothCondition}
          onNotesChange={updateToothNotes}
        />
      )}
    </div>
  );
}
