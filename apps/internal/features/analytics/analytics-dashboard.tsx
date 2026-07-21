"use client";

import { Download } from "lucide-react";
import {
  Button,
  DataState
} from "@workspace/ui/components";
import {
  BillingOverviewCards,
  MetricCardsGrid,
} from "@/features/analytics";
import { useAnalyticsDashboard } from "./use-analytics-dashboard";
import {
  AnalyticsDetailedMetricsSection,
  AnalyticsGrowthMetricSection,
  AnalyticsMrrTrendSection,
  AnalyticsReportingWindowSection,
  AnalyticsSubscriptionBreakdownSection,
} from "./analytics-dashboard-sections";

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

        <AnalyticsReportingWindowSection
          period={period}
          onPeriodChange={setPeriod}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />

        <MetricCardsGrid metrics={metrics} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AnalyticsMrrTrendSection
            revenueByMonth={revenueByMonth}
            maxRevenue={maxRevenue}
          />
          <AnalyticsSubscriptionBreakdownSection
            tierEntries={tierEntries}
            totalTierCount={totalTierCount}
          />
          {data?.newPatients ? (
            <AnalyticsGrowthMetricSection
              value={data.newPatients}
              change={data.patientsChange}
              label="Patient Growth"
            />
          ) : null}
          {data?.appointments ? (
            <AnalyticsGrowthMetricSection
              value={data.appointments}
              change={data.appointmentsChange}
              label="Appointment Volume"
            />
          ) : null}
        </div>

        <AnalyticsDetailedMetricsSection
          detailedMetrics={data?.detailedMetrics}
        />
      </div>
    </DataState>
  );
}
