"use client";

import { Calendar } from "lucide-react";
import { Button, DatePicker, Section, SymbolTooltip } from "@workspace/ui/components";
import { formatAmountLocale } from "@workspace/utils";
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
    loading: () => (
      <div
        className="ui-section-stack flex flex-col items-center gap-3 py-8 text-center text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label="Loading detailed metrics"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8"
        />
        <p className="text-sm">Loading detailed metrics…</p>
      </div>
    ),
    ssr: false,
  },
);

interface PeriodSectionProps {
  period: string;
  onPeriodChange: (period: "daily" | "weekly" | "monthly") => void;
  startDate: string | undefined;
  onStartDateChange: (date: string) => void;
  endDate: string | undefined;
  onEndDateChange: (date: string) => void;
}

export function AnalyticsReportingWindowSection({
  period,
  onPeriodChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: PeriodSectionProps) {
  return (
    <Section
      title="Reporting Window"
      description="Filter the dashboard by time range without breaking the shared page rhythm."
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
              {p.charAt(0).toUpperCase() + p.slice(1)}
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
              placeholder="Start date"
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="ui-helper-text">to</span>
            <DatePicker
              value={endDate || undefined}
              onChange={(date) =>
                onEndDateChange(date?.toISOString().slice(0, 10) ?? "")
              }
              placeholder="End date"
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
  if (revenueByMonth.length === 0) return null;

  return (
    <Section
      title="MRR Trend (6 months)"
      description="Recent recurring revenue performance"
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
  if (tierEntries.length === 0) return null;

  return (
    <Section
      title="Subscription Breakdown"
      description="Customer mix across Docita plans"
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
  return (
    <Section
      title={label}
      description={`${label.toLowerCase()} in the current period`}
      contentClassName="flex h-40 items-center justify-center"
    >
      <div className="text-center">
        <p className="text-[var(--fs-4xl)] font-bold text-foreground">
          {value}
        </p>
        <p className="ui-section-subtitle mt-1">
          {label.toLowerCase()} this period
        </p>
        {change !== undefined && (
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              change >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {change >= 0 ? "\u2191" : "\u2193"} {Math.abs(change).toFixed(1)}%
            vs last period
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
  return (
    <Section
      title="Detailed Metrics"
      description="Expanded operational metrics for the selected time range."
      contentClassName="space-y-4"
    >
      {detailedMetrics && detailedMetrics.length > 0 ? (
        <AnalyticsDetailedMetricsTable rows={detailedMetrics} />
      ) : (
        <div className="ui-section-stack py-8 text-center text-muted-foreground">
          <p>No detailed metrics available for this period</p>
        </div>
      )}
    </Section>
  );
}
