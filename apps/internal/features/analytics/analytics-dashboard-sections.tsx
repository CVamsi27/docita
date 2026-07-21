"use client";

import { Calendar } from "lucide-react";
import { Button, DatePicker, Section, SymbolTooltip } from "@workspace/ui/components";
import { formatAmountLocale } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { cn } from "@workspace/ui/lib/utils";
import { getInternalTierChartColorClass } from "@/lib/tier-display";
import dynamic from "next/dynamic";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { DetailedMetricsRow } from "@/features/analytics/analytics-detailed-metrics-table";

const AnalyticsDetailedMetricsTable = dynamic(
  () =>
    import("@/features/analytics/analytics-detailed-metrics-table").then(
      (module) => module.AnalyticsDetailedMetricsTable,
    ),
  {
    loading: () => <AnalyticsDetailedMetricsLoading />,
    ssr: false,
  },
);

function AnalyticsDetailedMetricsLoading() {
  const t = useTranslations("AnalyticsDashboard.detailedMetrics");
  return (
    <div
      className="ui-section-stack flex flex-col items-center gap-3 py-8 text-center text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label={t("loadingAria")}
    >
      <DocitaLoadingIndicator
        variant="section"
        withStatusRole={false}
        iconClassName="h-8 w-8"
      />
      <p className="text-sm">{t("loadingMessage")}</p>
    </div>
  );
}

interface PeriodSectionProps {
  period: string;
  onPeriodChange: (period: "daily" | "weekly" | "monthly") => void;
  startDate: string | undefined;
  onStartDateChange: (date: string) => void;
  endDate: string | undefined;
  onEndDateChange: (date: string) => void;
}

const PERIOD_LABEL_KEYS: Record<"daily" | "weekly" | "monthly", string> = {
  daily: "periodDaily",
  weekly: "periodWeekly",
  monthly: "periodMonthly",
};

export function AnalyticsReportingWindowSection({
  period,
  onPeriodChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: PeriodSectionProps) {
  const t = useTranslations("AnalyticsDashboard.reportingWindow");
  return (
    <Section
      title={t("title")}
      description={t("description")}
      contentClassName="space-y-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <Button
              key={p}
              onClick={() => onPeriodChange(p)}
              size="sm"
              variant={period === p ? "default" : "outline"}
            >
              {t(PERIOD_LABEL_KEYS[p])}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <DatePicker
              value={startDate || undefined}
              onChange={(date) =>
                onStartDateChange(date?.toISOString().slice(0, 10) ?? "")
              }
              placeholder={t("startDatePlaceholder")}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="ui-helper-text">{t("toLabel")}</span>
            <DatePicker
              value={endDate || undefined}
              onChange={(date) =>
                onEndDateChange(date?.toISOString().slice(0, 10) ?? "")
              }
              placeholder={t("endDatePlaceholder")}
              className="w-40"
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

interface MrrTrendSectionProps {
  revenueByMonth: Array<{ month: string; revenue: number }>;
  maxRevenue: number;
}

export function AnalyticsMrrTrendSection({
  revenueByMonth,
  maxRevenue,
}: MrrTrendSectionProps) {
  const t = useTranslations("AnalyticsDashboard.mrrTrend");
  if (revenueByMonth.length === 0) return null;

  return (
    <Section
      title={t("title")}
      description={t("description")}
      contentClassName="space-y-4"
    >
      <div className="flex items-end gap-2 h-40">
        {revenueByMonth.map((item) => (
          <div
            key={item.month}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <SymbolTooltip
              label={`${item.month}: \u20B9${formatAmountLocale(
                item.revenue,
                "en-IN",
                {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                },
              )}`}
            >
              <div
                className="w-full bg-primary rounded-t-sm min-h-[4px]"
                style={{
                  height: `${Math.round((item.revenue / maxRevenue) * 100)}%`,
                }}
              />
            </SymbolTooltip>
            <span className="text-xs text-muted-foreground truncate w-full text-center">
              {item.month.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

interface SubscriptionBreakdownSectionProps {
  tierEntries: Array<[string, number]>;
  totalTierCount: number;
}

export function AnalyticsSubscriptionBreakdownSection({
  tierEntries,
  totalTierCount,
}: SubscriptionBreakdownSectionProps) {
  const t = useTranslations("AnalyticsDashboard.subscriptionBreakdown");
  if (tierEntries.length === 0) return null;

  return (
    <Section
      title={t("title")}
      description={t("description")}
      contentClassName="space-y-3"
    >
      <div className="space-y-3">
        {tierEntries.map(([tier, count]) => (
          <div key={tier} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{tier}</span>
              <span className="text-muted-foreground">
                {count} (
                {totalTierCount > 0
                  ? ((count / totalTierCount) * 100).toFixed(0)
                  : 0}
                %)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${getInternalTierChartColorClass(tier)}`}
                style={{
                  width: `${totalTierCount > 0 ? (count / totalTierCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

interface GrowthMetricSectionProps {
  value: number;
  change: number | undefined;
  label: string;
}

export function AnalyticsGrowthMetricSection({
  value,
  change,
  label,
}: GrowthMetricSectionProps) {
  const t = useTranslations("AnalyticsDashboard.growthMetric");
  return (
    <Section
      title={label}
      description={t("description", { label })}
      contentClassName="flex h-40 items-center justify-center"
    >
      <div className="text-center">
        <p className="text-[var(--fs-4xl)] font-bold text-foreground">
          {value}
        </p>
        <p className="ui-section-subtitle mt-1">
          {t("thisPeriod", { label })}
        </p>
        {change !== undefined && (
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              change >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {change >= 0
              ? t("vsLastPeriodUp", {
                  change: Math.abs(change).toFixed(1),
                })
              : t("vsLastPeriodDown", {
                  change: Math.abs(change).toFixed(1),
                })}
          </p>
        )}
      </div>
    </Section>
  );
}

interface DetailedMetricsSectionProps {
  detailedMetrics: DetailedMetricsRow[] | undefined;
}

export function AnalyticsDetailedMetricsSection({
  detailedMetrics,
}: DetailedMetricsSectionProps) {
  const t = useTranslations("AnalyticsDashboard.detailedMetrics");
  return (
    <Section
      title={t("title")}
      description={t("description")}
      contentClassName="space-y-4"
    >
      {detailedMetrics && detailedMetrics.length > 0 ? (
        <AnalyticsDetailedMetricsTable rows={detailedMetrics} />
      ) : (
        <div className="ui-section-stack py-8 text-center text-muted-foreground">
          <p>{t("empty")}</p>
        </div>
      )}
    </Section>
  );
}
