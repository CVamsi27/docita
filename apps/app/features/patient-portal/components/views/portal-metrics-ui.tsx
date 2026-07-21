"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { queryKeys, usePortalMetricCategories, usePortalMetricHistory } from "@workspace/data-access";
import { MetricCategorySection } from "@/features/patient-portal/components/metrics/metric-category-section";
import { AddMetricDefinitionModal } from "@/features/patient-portal/components/metrics/add-metric-definition-modal";
import { useQueryClient } from "@tanstack/react-query";
import { metricHistoryResponseSchema } from "@workspace/types";
import { PortalMetricsHeader, PortalMetricsToolbar, toPortalMetricRecord, readPortalMetricCategory, getDateRange, type PortalMetricRecord, type PortalMetricCategory } from "./portal-metrics-ui-sections";

interface PortalMetricsUIProps {
  showHeader?: boolean;
}

export function PortalMetricsUI({ showHeader = true }: PortalMetricsUIProps) {
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
      {showHeader ? <PortalMetricsHeader /> : null}

      <PortalMetricsToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        isLoading={isLoading}
        onRefresh={() => refetchHistory()}
        onAddMetric={() => setShowAddModal(true)}
      />

      <DataState
        status={status}
        loadingMessage="Loading metrics\u2026"
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

      {showAddModal ? (
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
      ) : null}
    </div>
  );
}
