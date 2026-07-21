"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@workspace/ui/lib/utils";
import type { MedicationAdherenceSummary } from "@workspace/types";

interface AdherenceChartProps {
  summary: MedicationAdherenceSummary;
  label?: string;
}

export function AdherenceChart({ summary, label }: AdherenceChartProps) {
  const t = useTranslations("PatientPortal.adherenceChart");
  const { adherenceRate, taken, missed, skipped, totalDoses } = summary;

  const color =
    adherenceRate >= 80
      ? "text-success"
      : adherenceRate >= 50
        ? "text-warning"
        : "text-destructive";

  const bgColor =
    adherenceRate >= 80
      ? "bg-success"
      : adherenceRate >= 50
        ? "bg-warning"
        : "bg-destructive";

  const message =
    adherenceRate >= 80
      ? t("messageGreat")
      : adherenceRate >= 50
        ? t("messageImprove")
        : t("messageConsult");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {label ?? t("defaultTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={cn("text-4xl font-bold tabular-nums", color)}>
            {Math.round(adherenceRate)}%
          </div>
          <div>
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">
              {t("summaryLine", { taken, total: totalDoses })}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
            {totalDoses > 0 && (
              <>
                <div
                  className={cn("h-full", bgColor)}
                  style={{ width: `${(taken / totalDoses) * 100}%` }}
                />
                {missed > 0 && (
                  <div
                    className="h-full bg-destructive/40"
                    style={{ width: `${(missed / totalDoses) * 100}%` }}
                  />
                )}
                {skipped > 0 && (
                  <div
                    className="h-full bg-warning/40"
                    style={{ width: `${(skipped / totalDoses) * 100}%` }}
                  />
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success inline-block" />
              {t("takenLegend", { count: taken })}
            </span>
            {missed > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-destructive/40 inline-block" />
                {t("missedLegend", { count: missed })}
              </span>
            )}
            {skipped > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning/40 inline-block" />
                {t("skippedLegend", { count: skipped })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
