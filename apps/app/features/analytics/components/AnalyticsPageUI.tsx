import { DEFAULT_CURRENCY } from "@workspace/utils";
import React, { FC } from "react";
import dynamic from "next/dynamic";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ArrowLeft, Calendar, DollarSign, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Feature,
  FeatureGate,
} from "@/features/_shared/components/auth/feature-gate";
import type {
  AnalyticsOverview,
  AnalyticsTab,
  ComplianceMetric,
  DiseaseTrend,
  RevenueByCPT,
} from "@/features/analytics/hooks/use-analytics-logic";
import { OverviewCard } from "./charts/OverviewCard";
import { AnalyticsUpgradeState } from "./charts/AnalyticsUpgradeState";

const TrendsBarChart = dynamic(
  () => import("./charts/TrendsCharts").then((module) => module.TrendsBarChart),
  { ssr: false },
);

const TrendsPieChart = dynamic(
  () => import("./charts/TrendsCharts").then((module) => module.TrendsPieChart),
  { ssr: false },
);

const RevenueBarChart = dynamic(
  () =>
    import("./charts/RevenueCharts").then((module) => module.RevenueBarChart),
  { ssr: false },
);

const RevenuePieChart = dynamic(
  () =>
    import("./charts/RevenueCharts").then((module) => module.RevenuePieChart),
  { ssr: false },
);

const ComplianceDashboard = dynamic(
  () =>
    import("./charts/ComplianceDashboard").then(
      (module) => module.ComplianceDashboard,
    ),
  { ssr: false },
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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <FeatureGate
      feature={Feature.ADVANCED_ANALYTICS}
      fallback={<AnalyticsUpgradeState />}
    >
      <div className="flex-1 space-y-6">
        <AnalyticsHeader />

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            title="Total Patients"
            value={overview?.totalPatients || 0}
            growth={overview?.patientGrowth || 0}
            icon={Users}
          />
          <OverviewCard
            title="New Patients"
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
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="disease-trends">Disease Trends</TabsTrigger>
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
      </div>
    </FeatureGate>
  );
};

const AnalyticsHeader = () => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
    <p className="text-muted-foreground">
      Insights and performance metrics for your facility
    </p>
  </div>
);
