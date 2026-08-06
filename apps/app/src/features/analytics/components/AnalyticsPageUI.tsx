"use client";

import { FC, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { AppPageScaffold, DataState, LoadingState, PageHeader, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components";
import { Calendar, DollarSign, Users } from "lucide-react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Feature, FeatureGate } from "@/components/auth/feature-gate";
import type {
  AnalyticsOverview,
  AnalyticsTab,
  ComplianceMetric,
  DiseaseTrend,
  RevenueByCPT,
} from "@/features/analytics/hooks/use-analytics-logic";
import { OverviewCard } from "./charts/OverviewCard";
import { AnalyticsUpgradeState } from "./charts/AnalyticsUpgradeState";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";

function AnalyticsChartCellLoading() {
  const { t } = useTranslation("Analytics");
  return (
    <div
      className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-lg border border-border/50 bg-card/30 p-6"
      role="status"
      aria-live="polite"
      aria-label={t("page.chartLoadingAria")}
    >
      <DocitaLoadingIndicator
        variant="section"
        withStatusRole={false}
        iconClassName="h-9 w-9"
      />
      <div className="w-full space-y-2">
        <Skeleton className="mx-auto h-3 w-24" />
        <Skeleton className="h-36 w-full rounded-md" />
      </div>
    </div>
  );
}

const TrendsBarChart = lazy(() =>
  import("./charts/TrendsCharts").then((module) => ({
    default: module.TrendsBarChart,
  })),
);

const TrendsPieChart = lazy(() =>
  import("./charts/TrendsCharts").then((module) => ({
    default: module.TrendsPieChart,
  })),
);

const RevenueBarChart = lazy(() =>
  import("./charts/RevenueCharts").then((module) => ({
    default: module.RevenueBarChart,
  })),
);

const RevenuePieChart = lazy(() =>
  import("./charts/RevenueCharts").then((module) => ({
    default: module.RevenuePieChart,
  })),
);

const ComplianceDashboard = lazy(() =>
  import("./charts/ComplianceDashboard").then((module) => ({
    default: module.ComplianceDashboard,
  })),
);

interface AnalyticsPageUIProps {
  overview?: AnalyticsOverview;
  diseaseTrends: DiseaseTrend[];
  revenueByCPT: RevenueByCPT[];
  complianceMetrics: ComplianceMetric[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  trendsLoading: boolean;
  revenueLoading: boolean;
  complianceLoading: boolean;
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
}

export const AnalyticsPageUI: FC<AnalyticsPageUIProps> = ({
  overview,
  diseaseTrends,
  revenueByCPT,
  complianceMetrics,
  isLoading,
  isError,
  onRetry,
  trendsLoading,
  revenueLoading,
  complianceLoading,
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation("Analytics");
  const clinicCurrency = useClinicCurrency();

  if (isLoading) return (
      <LoadingState message={t("page.loadingMessage")} className="min-h-[60vh]" />
    );

  if (isError) {
    return (
      <DataState
        status="error"
        className="min-h-[60vh]"
        errorMessage={t("page.errorMessage")}
        onRetry={onRetry}
      />
    );
  }

  const formatCurrency = (amount: number) =>
    clinicCurrency.formatCurrency(amount, { fractionDigits: 0 });

  return (
    <FeatureGate
      feature={Feature.ADVANCED_ANALYTICS}
      fallback={<AnalyticsUpgradeState />}
    >
      <AppPageScaffold
        header={
          <PageHeader
            title={t("page.title")}
            description={t("page.description")}
          />
        }
      >
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            title={t("page.totalPatients")}
            value={overview?.totalPatients || 0}
            growth={overview?.patientGrowth || 0}
            icon={Users}
          />
          <OverviewCard
            title={t("page.newPatients")}
            value={overview?.newPatientsThisMonth || 0}
            icon={Users}
            subtitle={t("page.thisMonth")}
          />
          <OverviewCard
            title={t("page.appointments")}
            value={overview?.appointmentsThisMonth || 0}
            icon={Calendar}
            subtitle={t("page.thisMonth")}
          />
          <OverviewCard
            title={t("page.revenue")}
            value={formatCurrency(overview?.revenueThisMonth || 0)}
            growth={overview?.revenueGrowth || 0}
            icon={DollarSign}
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(nextTab) => onTabChange(nextTab as AnalyticsTab)}
          className="space-y-4"
        >
          <TabsList className="w-full max-md:overflow-x-auto max-md:overscroll-x-contain max-md:flex-nowrap sm:w-auto md:flex-wrap">
            <TabsTrigger value="disease-trends">{t("page.tabDiseaseTrends")}</TabsTrigger>
            <TabsTrigger value="cpt-revenue">{t("page.tabCptRevenue")}</TabsTrigger>
            <TabsTrigger value="compliance">{t("page.tabCompliance")}</TabsTrigger>
          </TabsList>

          <TabsContent value="disease-trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Suspense fallback={<AnalyticsChartCellLoading />}>
                <TrendsBarChart data={diseaseTrends} loading={trendsLoading} />
              </Suspense>
              <Suspense fallback={<AnalyticsChartCellLoading />}>
                <TrendsPieChart data={diseaseTrends} loading={trendsLoading} />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="cpt-revenue" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Suspense fallback={<AnalyticsChartCellLoading />}>
                <RevenueBarChart data={revenueByCPT} loading={revenueLoading} />
              </Suspense>
              <Suspense fallback={<AnalyticsChartCellLoading />}>
                <RevenuePieChart data={revenueByCPT} loading={revenueLoading} />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Suspense fallback={<AnalyticsChartCellLoading />}>
              <ComplianceDashboard
                metrics={complianceMetrics}
                loading={complianceLoading}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </AppPageScaffold>
    </FeatureGate>
  );
};
