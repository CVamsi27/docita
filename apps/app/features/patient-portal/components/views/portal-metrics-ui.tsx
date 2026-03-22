"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus, RefreshCw } from "lucide-react";
import {
  usePortalMetricCategories,
  usePortalMetricHistory,
} from "@/hooks/api/use-patient-portal";
import { MetricCategorySection } from "@/features/patient-portal/components/metrics/metric-category-section";
import { AddMetricDefinitionModal } from "@/features/patient-portal/components/metrics/add-metric-definition-modal";
import { useQueryClient } from "@tanstack/react-query";

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

export function PortalMetricsUI() {
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
    refetch: refetchHistory,
  } = usePortalMetricHistory({ from, to, limit: 500 });

  const handleRecordSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: ["patient-portal", "metrics", "history"],
    });
  };

  const isLoading = categoriesLoading || historyLoading;

  if (categoriesError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load metrics. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const allRecords = (historyData?.timeline ?? []) as Array<{
    id: string;
    definitionId: string;
    recordedAt: string;
    values: Array<{
      valueNumber?: number | null;
      valueString?: string | null;
      valueBoolean?: boolean | null;
    }>;
  }>;

  const categoryList = (categories ?? []) as Array<{
    id: string;
    key: string;
    name: string;
    metricDefinitions: Array<{
      id: string;
      key: string;
      label: string;
      unit?: string | null;
      valueType: string;
      isTracked: boolean;
    }>;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Track and monitor your personal health metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchHistory()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
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

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-28 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : categoryList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No metric categories available.</p>
          <Button
            variant="link"
            onClick={() => setShowAddModal(true)}
            className="mt-2"
          >
            Add your first custom metric
          </Button>
        </div>
      ) : (
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
      )}

      {showAddModal && (
        <AddMetricDefinitionModal
          categories={categoryList.map((c) => ({ id: c.id, name: c.name }))}
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["patient-portal", "metrics", "categories"],
            });
          }}
        />
      )}
    </div>
  );
}
