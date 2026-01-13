
import React from "react";
import { Activity } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface VitalSign {
  type: string; // e.g., 'BP', 'Pulse'
  value: string;
  unit: string;
  status?: "normal" | "elevated" | "low" | "critical";
  date?: Date;
}

interface SummaryVitalsProps {
  vitals: VitalSign[];
  className?: string;
  gridCols?: number;
}

const VITAL_STATUS_COLORS = {
  normal: "text-green-600",
  elevated: "text-orange-600",
  low: "text-blue-600",
  critical: "text-red-600 animate-pulse",
};

export function SummaryVitals({
  vitals,
  className,
  gridCols = 2,
}: SummaryVitalsProps) {
  if (!vitals || vitals.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Latest Vitals
      </div>
      <div className={`grid grid-cols-${gridCols} gap-2`}>
        {vitals.map((vital, i) => (
          <div
            key={i}
            className="p-2 bg-muted rounded-md flex flex-col items-center justify-center text-center"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {vital.type}
            </span>
            <div className="flex items-end gap-1 font-mono">
              <span
                className={cn(
                  "font-bold text-lg",
                  vital.status && VITAL_STATUS_COLORS[vital.status],
                )}
              >
                {vital.value}
              </span>
              <span className="text-xs text-muted-foreground mb-1">
                {vital.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
