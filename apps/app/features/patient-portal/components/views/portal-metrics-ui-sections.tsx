"use client";

// jscpd:ignore-start
import { Plus, RefreshCw } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SymbolTooltip } from "@workspace/ui/components";
import { isRecord } from "@workspace/utils";
import type { MetricRecordResponse } from "@workspace/types";

export type PortalMetricRecord = {
  id: string;
  definitionId: string;
  recordedAt: string;
  values: Array<{
    valueNumber?: number | null;
    valueString?: string | null;
    valueBoolean?: boolean | null;
  }>;
};
// jscpd:ignore-end

export type PortalMetricDefinition = {
  id: string;
  key: string;
  label: string;
  unit?: string | null;
  valueType: string;
  isTracked: boolean;
};

export type PortalMetricCategory = {
  id: string;
  name: string;
  metricDefinitions: PortalMetricDefinition[];
};

export function toPortalMetricRecord(
  record: MetricRecordResponse,
): PortalMetricRecord | null {
  const definitionId = record.definitionId ?? record.definition.id;
  if (!definitionId) return null;
  const recordedAt =
    typeof record.recordedAt === "string"
      ? record.recordedAt
      : record.recordedAt.toISOString();
  return {
    id: record.id,
    definitionId,
    recordedAt,
    values: record.values.map((value) => ({
      valueNumber: value.valueNumber,
      valueString: value.valueString,
      valueBoolean: value.valueBoolean,
    })),
  };
}

export function readPortalMetricDefinition(
  value: unknown,
): PortalMetricDefinition | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.key !== "string") return null;
  return {
    id: value.id,
    key: value.key,
    label: typeof value.label === "string" ? value.label : value.key,
    unit:
      typeof value.unit === "string" || value.unit === null ? value.unit : null,
    valueType: typeof value.valueType === "string" ? value.valueType : "NUMBER",
    isTracked: value.isTracked === true,
  };
}

export function readPortalMetricCategory(value: unknown): PortalMetricCategory | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;
  const metricDefinitions = Array.isArray(value.metricDefinitions)
    ? value.metricDefinitions
        .map(readPortalMetricDefinition)
        .filter((entry): entry is PortalMetricDefinition => entry !== null)
    : [];
  return { id: value.id, name: value.name, metricDefinitions };
}

export const DATE_RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "180", label: "Last 6 months" },
] as const;

export function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function PortalMetricsHeader() {
  return (
    <div>
      <h1 className="ui-page-title">My metrics</h1>
      <p className="ui-page-subtitle">
        Track and monitor your personal health metrics
      </p>
    </div>
  );
}

export function PortalMetricsToolbar({
  dateRange,
  onDateRangeChange,
  isLoading,
  onRefresh,
  onAddMetric,
}: {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onAddMetric: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="flex items-center gap-2">
        <SymbolTooltip label="Refresh metrics">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh metrics"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </SymbolTooltip>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddMetric}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Metric
        </Button>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
