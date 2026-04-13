import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";
import type { DentalChartData } from "@workspace/types";
import { useConstants } from "@/hooks/api/use-common";
import { Skeleton } from "@workspace/ui/components/skeleton";

export type DentalChartValue = DentalChartData;

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
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  const { teethQuadrants: TEETH_QUADRANTS, toothConditions: TOOTH_CONDITIONS } =
    constants;

  const getToothData = (toothId: number) => {
    return value?.[toothId] || { condition: "HEALTHY", notes: "" };
  };

  const handleToothClick = (toothId: number) => {
    if (readOnly) return;
    setSelectedTooth(toothId);
  };

  const updateToothCondition = (condition: string) => {
    if (selectedTooth === null) return;
    const newData = {
      ...value,
      [selectedTooth]: {
        ...getToothData(selectedTooth),
        condition,
      },
    };
    onChange(newData);
  };

  const updateToothNotes = (notes: string) => {
    if (selectedTooth === null) return;
    const newData = {
      ...value,
      [selectedTooth]: {
        ...getToothData(selectedTooth),
        notes,
      },
    };
    onChange(newData);
  };

  const renderTooth = (toothId: number) => {
    const data = getToothData(toothId);
    const condition =
      TOOTH_CONDITIONS.find((c) => c.value === data.condition) ||
      TOOTH_CONDITIONS[0];
    const isSelected = selectedTooth === toothId;

    return (
      <button
        key={toothId}
        type="button"
        onClick={() => handleToothClick(toothId)}
        className={cn(
          "h-12 w-10 flex flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors duration-150",
          condition.color,
          isSelected ? "ring-2 ring-primary ring-offset-2" : "",
          readOnly ? "cursor-default" : "cursor-pointer hover:shadow-sm",
        )}
        title={`Tooth ${toothId}: ${condition.label}`}
      >
        <span className="text-[10px] text-muted-foreground">{toothId}</span>
        <div
          className={`w-3 h-3 rounded-full mt-1 ${getConditionColor(condition.value)}`}
        />
      </button>
    );
  };

  const getConditionColor = (code: string) => {
    switch (code) {
      case "CARIES":
        return "bg-destructive";
      case "FILLED":
        return "bg-info";
      case "CROWN":
        return "bg-warning";
      case "ROOT_CANAL":
        return "bg-primary";
      case "IMPLANT":
        return "bg-success";
      case "MISSING":
        return "bg-muted-foreground/50";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 items-center p-6 bg-muted/50 rounded-xl border border-muted">
        <div className="flex gap-8">
          <div className="flex gap-1">
            {TEETH_QUADRANTS.UR.map(renderTooth)}
          </div>
          <div className="flex gap-1">
            {TEETH_QUADRANTS.UL.map(renderTooth)}
          </div>
        </div>

        <div className="w-full h-px bg-border relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-muted/50 px-2 text-xs text-muted-foreground font-medium tracking-widest">
            FDI CHART
          </span>
        </div>

        <div className="flex gap-8">
          <div className="flex gap-1">
            {TEETH_QUADRANTS.LR.map(renderTooth)}
          </div>
          <div className="flex gap-1">
            {TEETH_QUADRANTS.LL.map(renderTooth)}
          </div>
        </div>
      </div>

      {!readOnly && selectedTooth && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              Tooth {selectedTooth}
              <span className="text-sm font-normal text-muted-foreground">
                ({getToothData(selectedTooth).condition})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TOOTH_CONDITIONS.map((cond) => (
                <Button
                  key={cond.value}
                  type="button"
                  variant={
                    getToothData(selectedTooth).condition === cond.value
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => updateToothCondition(cond.value)}
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
              <textarea
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Specific notes for this tooth..."
                value={getToothData(selectedTooth).notes}
                onChange={(e) => updateToothNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
