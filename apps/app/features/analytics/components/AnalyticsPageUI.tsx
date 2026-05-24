"use client";

import React, { FC } from "react";
import dynamic from "next/dynamic";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import { Calendar, DollarSign, Users } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import {
  Feature,
  FeatureGate,
} from "@/components/auth/feature-gate";
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
  return (
    <div
      className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-lg border border-border/50 bg-card/30 p-6"
      role="status"
      aria-live="polite"
      aria-label="Loading chart"
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

const TrendsBarChart = dynamic(
  () => import("./charts/TrendsCharts").then((module) => module.TrendsBarChart),
  {
    ssr: false,
    loading: () => <AnalyticsChartCellLoading />,
  },
);

const TrendsPieChart = dynamic(
  () => import("./charts/TrendsCharts").then((module) => module.TrendsPieChart),
  {
    ssr: false,
    loading: () => <AnalyticsChartCellLoading />,
  },
);

const RevenueBarChart = dynamic(
  () =>
    import("./charts/RevenueCharts").then((module) => module.RevenueBarChart),
  {
    ssr: false,
    loading: () => <AnalyticsChartCellLoading />,
  },
);

const RevenuePieChart = dynamic(
  () =>
    import("./charts/RevenueCharts").then((module) => module.RevenuePieChart),
  {
    ssr: false,
    loading: () => <AnalyticsChartCellLoading />,
  },
);

const ComplianceDashboard = dynamic(
  () =>
    import("./charts/ComplianceDashboard").then(
      (module) => module.ComplianceDashboard,
    ),
  {
    ssr: false,
    loading: () => <AnalyticsChartCellLoading />,
  },
);

interface AnalyticsPageUIProps {
  overview?: AnalyticsOverview;
  diseaseTrends: DiseaseTrend[];
  revenueByCPT: RevenueByCPT[];
  complianceMetrics: ComplianceMetric[];
  isLoading: boolean;
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
  trendsLoading,
  revenueLoading,
  complianceLoading,
  activeTab,
  onTabChange,
}) => {
  const clinicCurrency = useClinicCurrency();

  if (isLoading) {
    return <LoadingState message="Loading analytics…" className="min-h-[60vh]" />;
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
            title="Analytics"
            description="Insights and performance metrics for your facility."
          />
        }
      >
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            title="Total patients"
            value={overview?.totalPatients || 0}
            growth={overview?.patientGrowth || 0}
            icon={Users}
          />
          <OverviewCard
            title="New patients"
            value={overview?.newPatientsThisMonth || 0}
            icon={Users}
            subtitle="This month"
          />
          <OverviewCard
            title="Appointments"
            value={overview?.appointmentsThisMonth || 0}
            icon={Calendar}
            subtitle="This month"
          />
          <OverviewCard
            title="Revenue"
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
          <TabsList className="w-full sm:w-auto overflow-x-hidden flex flex-wrap">
            <TabsTrigger value="disease-trends">Disease trends</TabsTrigger>
            <TabsTrigger value="cpt-revenue">CPT Revenue</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="disease-trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TrendsBarChart data={diseaseTrends} loading={trendsLoading} />
              <TrendsPieChart data={diseaseTrends} loading={trendsLoading} />
            </div>
          </TabsContent>

          <TabsContent value="cpt-revenue" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <RevenueBarChart data={revenueByCPT} loading={revenueLoading} />
              <RevenuePieChart data={revenueByCPT} loading={revenueLoading} />
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <ComplianceDashboard
              metrics={complianceMetrics}
              loading={complianceLoading}
            />
          </TabsContent>
        </Tabs>
      </AppPageScaffold>
    </FeatureGate>
  );
};
