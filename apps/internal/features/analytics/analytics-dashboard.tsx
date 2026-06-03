"use client";

import dynamic from "next/dynamic";
import { Calendar, Download } from "lucide-react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { getInternalTierChartColorClass } from "@/lib/tier-display";
import { Button } from "@workspace/ui/components/form/button";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { Section } from "@workspace/ui/components/layout/section";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { formatAmountLocale } from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";
import type { DetailedMetricsRow } from "@/features/analytics/analytics-detailed-metrics-table";
import {
  BillingOverviewCards,
  MetricCardsGrid,
} from "@/features/analytics";
import { useAnalyticsDashboard } from "./use-analytics-dashboard";

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

export function AnalyticsDashboard() {
  const {
    period,
    setPeriod,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    data,
    billing,
    pageStatus,
    errorMessage,
    handleExport,
    formatCurrency,
    metrics,
    tierEntries,
    totalTierCount,
    revenueByMonth,
    maxRevenue,
    refetch,
  } = useAnalyticsDashboard();

  return (
    <DataState
      status={pageStatus}
      loadingMessage="Loading analytics…"
      errorMessage={errorMessage}
      onRetry={refetch}
    >
      <div className="space-y-6 md:space-y-8">
        <div className="flex justify-end">
          <Button onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {billing && (
          <BillingOverviewCards
            billing={billing}
            formatCurrency={formatCurrency}
            tierEntries={tierEntries}
            totalTierCount={totalTierCount}
          />
        )}

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
                  onClick={() => setPeriod(p)}
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
                    setStartDate(date?.toISOString().slice(0, 10) ?? "")
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
                    setEndDate(date?.toISOString().slice(0, 10) ?? "")
                  }
                  placeholder="End date"
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </Section>

        <MetricCardsGrid metrics={metrics} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {revenueByMonth.length > 0 && (
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
                      label={`${item.month}: ₹${formatAmountLocale(
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
          )}

          {tierEntries.length > 0 && (
            <Section
              title="Subscription Breakdown"
              description="Customer mix across Docita plans"
              contentClassName="space-y-3"
            >
              <div className="space-y-3">
                {tierEntries.map(([tier, count]) => (
                  <div key={tier} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium">
                        {tier}
                      </span>
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
          )}

          {data?.newPatients ? (
            <Section
              title="Patient Growth"
              description="New-patient momentum in the current period"
              contentClassName="flex h-40 items-center justify-center"
            >
              <div className="text-center">
                <p className="text-[var(--fs-4xl)] font-bold text-foreground">
                  {data.newPatients}
                </p>
                <p className="ui-section-subtitle mt-1">
                  new patients this period
                </p>
                {data.patientsChange !== undefined && (
                  <p
                    className={cn(
                      "mt-1 text-sm font-medium",
                      data.patientsChange >= 0
                        ? "text-success"
                        : "text-destructive",
                    )}
                  >
                    {data.patientsChange >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(data.patientsChange).toFixed(1)}% vs last period
                  </p>
                )}
              </div>
            </Section>
          ) : null}

          {data?.appointments ? (
            <Section
              title="Appointment Volume"
              description="Booked appointment activity in the selected range"
              contentClassName="flex h-40 items-center justify-center"
            >
              <div className="text-center">
                <p className="text-[var(--fs-4xl)] font-bold text-foreground">
                  {data.appointments}
                </p>
                <p className="ui-section-subtitle mt-1">
                  appointments this period
                </p>
                {data.appointmentsChange !== undefined && (
                  <p
                    className={cn(
                      "mt-1 text-sm font-medium",
                      data.appointmentsChange >= 0
                        ? "text-success"
                        : "text-destructive",
                    )}
                  >
                    {data.appointmentsChange >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(data.appointmentsChange).toFixed(1)}% vs last
                    period
                  </p>
                )}
              </div>
            </Section>
          ) : null}
        </div>

        <Section
          title="Detailed Metrics"
          description="Expanded operational metrics for the selected time range."
          contentClassName="space-y-4"
        >
          {data?.detailedMetrics && data.detailedMetrics.length > 0 ? (
            <AnalyticsDetailedMetricsTable
              rows={data.detailedMetrics as unknown as DetailedMetricsRow[]}
            />
          ) : (
            <div className="ui-section-stack py-8 text-center text-muted-foreground">
              <p>No detailed metrics available for this period</p>
            </div>
          )}
        </Section>
      </div>
    </DataState>
  );
}
