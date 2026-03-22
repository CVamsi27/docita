"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Plus } from "lucide-react";
import { MetricSparkline } from "./metric-sparkline";
import { RecordMetricModal } from "./record-metric-modal";

interface MetricOption {
  id: string;
  value: string;
  label: string;
}

interface MetricDefinition {
  id: string;
  key: string;
  label: string;
  unit?: string | null;
  valueType: string;
  isTracked: boolean;
  metricOptions?: MetricOption[];
}

interface MetricRecord {
  id: string;
  definitionId: string;
  recordedAt: string;
  values: Array<{
    valueNumber?: number | null;
    valueString?: string | null;
    valueBoolean?: boolean | null;
  }>;
}

interface MetricCategorySectionProps {
  categoryName: string;
  definitions: MetricDefinition[];
  records: MetricRecord[];
  onRecordSuccess?: () => void;
}

function getLatestValue(
  records: MetricRecord[],
  definitionId: string,
): string | null {
  const record = records
    .filter((r) => r.definitionId === definitionId)
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )[0];

  if (!record || !record.values[0]) return null;

  const v = record.values[0];
  if (v.valueNumber !== undefined && v.valueNumber !== null)
    return String(v.valueNumber);
  if (v.valueString !== undefined && v.valueString !== null) return v.valueString;
  if (v.valueBoolean !== undefined && v.valueBoolean !== null)
    return v.valueBoolean ? "Yes" : "No";
  return null;
}

function getSparklineData(
  records: MetricRecord[],
  definitionId: string,
): Array<{ recordedAt: string; value: number }> {
  return records
    .filter(
      (r) =>
        r.definitionId === definitionId &&
        r.values[0]?.valueNumber !== undefined &&
        r.values[0]?.valueNumber !== null,
    )
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
    .map((r) => ({
      recordedAt: r.recordedAt,
      value: r.values[0]?.valueNumber ?? 0,
    }));
}

export function MetricCategorySection({
  categoryName,
  definitions,
  records,
  onRecordSuccess,
}: MetricCategorySectionProps) {
  const [selectedDefinition, setSelectedDefinition] =
    useState<MetricDefinition | null>(null);

  const trackedDefinitions = definitions.filter((d) => d.isTracked);

  if (trackedDefinitions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {categoryName}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trackedDefinitions.map((def) => {
            const latestValue = getLatestValue(records, def.id);
            const sparklineData = getSparklineData(records, def.id);

            return (
              <Card key={def.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      {def.label}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setSelectedDefinition(def)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      {latestValue !== null ? (
                        <span className="text-2xl font-semibold">
                          {latestValue}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No data yet
                        </span>
                      )}
                      {def.unit && latestValue !== null && (
                        <Badge variant="secondary" className="ml-1.5 text-xs">
                          {def.unit}
                        </Badge>
                      )}
                    </div>
                    {sparklineData.length >= 2 && (
                      <MetricSparkline data={sparklineData} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedDefinition && (
        <RecordMetricModal
          definition={selectedDefinition}
          open={!!selectedDefinition}
          onClose={() => setSelectedDefinition(null)}
          onSuccess={onRecordSuccess}
        />
      )}
    </>
  );
}
