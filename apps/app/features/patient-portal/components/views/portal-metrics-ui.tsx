"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Activity, Plus, RefreshCw } from "lucide-react";
import {
  queryKeys,
  usePortalMetricCategories,
  usePortalMetricHistory,
} from "@workspace/data-access";
import { MetricCategorySection } from "@/features/patient-portal/components/metrics/metric-category-section";
import { AddMetricDefinitionModal } from "@/features/patient-portal/components/metrics/add-metric-definition-modal";
import { useQueryClient } from "@tanstack/react-query";
import {
  metricHistoryResponseSchema,
  type MetricRecordResponse,
} from "@workspace/types";
import { isRecord } from "@workspace/utils";

type PortalMetricRecord = {
  id: string;
  definitionId: string;
  recordedAt: string;
  values: Array<{
    valueNumber?: number | null;
    valueString?: string | null;
    valueBoolean?: boolean | null;
  }>;
};

function toPortalMetricRecord(
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

type PortalMetricDefinition = {
  id: string;
  key: string;
  label: string;
  unit?: string | null;
  valueType: string;
  isTracked: boolean;
};

type PortalMetricCategory = {
  id: string;
  name: string;
  metricDefinitions: PortalMetricDefinition[];
};

function readPortalMetricDefinition(value: unknown): PortalMetricDefinition | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.key !== "string") {
    return null;
  }
  return {
    id: value.id,
    key: value.key,
    label: typeof value.label === "string" ? value.label : value.key,
    unit: typeof value.unit === "string" || value.unit === null ? value.unit : null,
    valueType: typeof value.valueType === "string" ? value.valueType : "NUMBER",
    isTracked: value.isTracked === true,
  };
}

function readPortalMetricCategory(value: unknown): PortalMetricCategory | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }
  const metricDefinitions = Array.isArray(value.metricDefinitions)
    ? value.metricDefinitions
        .map(readPortalMetricDefinition)
        .filter((entry): entry is PortalMetricDefinition => entry !== null)
    : [];
  return { id: value.id, name: value.name, metricDefinitions };
}

const DATE_RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "180", label: "Last 6 months" },
];

function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

interface PortalMetricsUIProps {
  showHeader?: boolean;
}

export function PortalMetricsUI({
  showHeader = true,
}: PortalMetricsUIProps) {
  const [dateRange, setDateRange] = useState("30");
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { from, to } = getDateRange(parseInt(dateRange, 10));

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = usePortalMetricCategories();

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = usePortalMetricHistory({ from, to, limit: 500 });

  const handleRecordSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.patientPortal.metrics.historyPrefix(),
    });
  };

  const isLoading = categoriesLoading || historyLoading;
  const hasError = Boolean(categoriesError) || Boolean(historyError);

  const parsedHistory = metricHistoryResponseSchema.safeParse(historyData);
  const allRecords = parsedHistory.success
    ? parsedHistory.data.timeline
        .map(toPortalMetricRecord)
        .filter((record): record is PortalMetricRecord => record !== null)
    : [];

  const categoryList = (Array.isArray(categories) ? categories : [])
    .map(readPortalMetricCategory)
    .filter((entry): entry is PortalMetricCategory => entry !== null);

  const status = isLoading
    ? "loading"
    : hasError
      ? "error"
      : categoryList.length === 0
        ? "empty"
        : "success";

  const handleRetry = () => {
    void refetchHistory();
    void queryClient.invalidateQueries({
      queryKey: queryKeys.patientPortal.metrics.categories(),
    });
  };

  return (
    <div className="space-y-6">
      {showHeader ? (
        <div>
          <h1 className="ui-page-title">My Metrics</h1>
          <p className="ui-page-subtitle">
            Track and monitor your personal health metrics
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <SymbolTooltip label="Refresh metrics">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchHistory()}
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
            onClick={() => setShowAddModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Metric
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
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

      <DataState
        status={status}
        loadingMessage="Loading metrics…"
        errorMessage="We could not load your health metrics. Please try again."
        onRetry={handleRetry}
        emptyIcon={Activity}
        emptyTitle="No metric categories available"
        emptyDescription="Create a custom metric to start tracking your health trends"
        emptyAction={{
          label: "Add your first custom metric",
          onClick: () => setShowAddModal(true),
        }}
      >
        <div className="space-y-8">
          {categoryList.map((category) => (
            <MetricCategorySection
              key={category.id}
              categoryName={category.name}
              definitions={category.metricDefinitions}
              records={allRecords}
              onRecordSuccess={handleRecordSuccess}
            />
          ))}
        </div>
      </DataState>

      {showAddModal && (
        <AddMetricDefinitionModal
          categories={categoryList.map((c) => ({ id: c.id, name: c.name }))}
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.patientPortal.metrics.categories(),
            });
          }}
        />
      )}
    </div>
  );
}
