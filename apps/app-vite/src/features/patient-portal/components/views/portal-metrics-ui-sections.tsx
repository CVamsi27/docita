"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SymbolTooltip } from "@workspace/ui/components";
import { useTranslation } from "react-i18next";
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

function buildDateRangeOptions(t: (key: string) => string) {
  return [
    { value: "7", label: t("metrics.rangeLast7") },
    { value: "30", label: t("metrics.rangeLast30") },
    { value: "90", label: t("metrics.rangeLast90") },
    { value: "180", label: t("metrics.rangeLast180") },
  ] as const;
}

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
  const { t } = useTranslation("PatientPortal");
  return (
    <div>
      <h1 className="ui-page-title">{t("metrics.pageTitle")}</h1>
      <p className="ui-page-subtitle">{t("metrics.pageSubtitle")}</p>
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
  const { t } = useTranslation("PatientPortal");
  const dateRangeOptions = buildDateRangeOptions(t);
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="flex items-center gap-2">
        <SymbolTooltip label={t("metrics.refreshLabel")}>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label={t("metrics.refreshLabel")}
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
          {t("metrics.addMetricButton")}
        </Button>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((opt) => (
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
