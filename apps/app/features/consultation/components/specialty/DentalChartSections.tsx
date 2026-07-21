"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  SymbolTooltip,
  Textarea
} from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { getConditionColor } from "./dental-chart-helpers";

interface DentalToothButtonProps {
  toothId: number;
  condition: string;
  conditionLabel: string;
  conditionColor: string;
  isSelected: boolean;
  readOnly?: boolean;
  onClick: (toothId: number) => void;
}

export function DentalToothButton({
  toothId,
  condition,
  conditionLabel,
  conditionColor,
  isSelected,
  readOnly,
  onClick,
}: DentalToothButtonProps) {
  const toothLabel = `Tooth ${toothId}: ${conditionLabel}`;

  return (
    <SymbolTooltip label={toothLabel} side="top">
      <button
        type="button"
        onClick={() => onClick(toothId)}
        className={cn(
          "h-12 w-10 flex flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors duration-150",
          conditionColor,
          isSelected ? "ring-2 ring-primary ring-offset-2" : "",
          readOnly ? "cursor-default" : "cursor-pointer hover:shadow-sm",
        )}
        aria-label={toothLabel}
      >
        <span className="text-[var(--fs-2xs)] text-muted-foreground">
          {toothId}
        </span>
        <div
          className={`w-3 h-3 rounded-full mt-1 ${getConditionColor(condition)}`}
        />
      </button>
    </SymbolTooltip>
  );
}

interface DentalToothGridProps {
  quadrants: Record<string, number[]>;
  toothData: Record<number, { condition: string; notes: string }>;
  conditions: { value: string; label: string; color: string }[];
  selectedTooth: number | null;
  readOnly?: boolean;
  onToothClick: (toothId: number) => void;
}

export function DentalToothGrid({
  quadrants,
  toothData,
  conditions,
  selectedTooth,
  readOnly,
  onToothClick,
}: DentalToothGridProps) {
  const renderTooth = (toothId: number) => {
    const data = toothData[toothId] || { condition: "HEALTHY", notes: "" };
    const condition =
      conditions.find((c) => c.value === data.condition) || conditions[0];

    return (
      <DentalToothButton
        key={toothId}
        toothId={toothId}
        condition={data.condition}
        conditionLabel={condition.label}
        conditionColor={condition.color}
        isSelected={selectedTooth === toothId}
        readOnly={readOnly}
        onClick={onToothClick}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4 items-center p-6 bg-muted/50 rounded-lg border border-muted">
      <div className="flex gap-8">
        <div className="flex gap-1">{quadrants.UR.map(renderTooth)}</div>
        <div className="flex gap-1">{quadrants.UL.map(renderTooth)}</div>
      </div>

      <div className="w-full h-px bg-border relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-muted/50 px-2 text-xs text-muted-foreground font-medium tracking-widest">
          FDI CHART
        </span>
      </div>

      <div className="flex gap-8">
        <div className="flex gap-1">{quadrants.LR.map(renderTooth)}</div>
        <div className="flex gap-1">{quadrants.LL.map(renderTooth)}</div>
      </div>
    </div>
  );
}

interface DentalToothEditorProps {
  selectedTooth: number;
  toothData: Record<number, { condition: string; notes: string }>;
  conditions: { value: string; label: string; color: string }[];
  onConditionChange: (toothId: number, condition: string) => void;
  onNotesChange: (toothId: number, notes: string) => void;
}

export function DentalToothEditor({
  selectedTooth,
  toothData,
  conditions,
  onConditionChange,
  onNotesChange,
}: DentalToothEditorProps) {
  const data = toothData[selectedTooth] || { condition: "HEALTHY", notes: "" };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          Tooth {selectedTooth}
          <span className="text-sm font-normal text-muted-foreground">
            ({data.condition})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {conditions.map((cond) => (
            <Button
              key={cond.value}
              type="button"
              variant={
                data.condition === cond.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => onConditionChange(selectedTooth, cond.value)}
              className="w-full justify-start"
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${getConditionColor(cond.value)}`}
              />
              {cond.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            className="min-h-20"
            placeholder="Tooth notes"
            value={data.notes}
            onChange={(e) => onNotesChange(selectedTooth, e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
