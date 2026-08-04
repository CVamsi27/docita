"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SymbolTooltip } from "@workspace/ui/components";
import { useTranslation } from "react-i18next";

function buildDateRangeOptions(t: (key: string) => string) {
  return [
    { value: "7", label: t("metrics.rangeLast7") },
    { value: "30", label: t("metrics.rangeLast30") },
    { value: "90", label: t("metrics.rangeLast90") },
    { value: "180", label: t("metrics.rangeLast180") },
  ] as const;
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
