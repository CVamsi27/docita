import React, { FC } from "react";
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
} from "@/features/_shared/components/feature-gate";
import type {
  AnalyticsOverview,
  DiseaseTrend,
  RevenueCPT,
  ComplianceMetric,
} from "../hooks/use-analytics-logic";
import { OverviewCard } from "./charts/OverviewCard";
import { TrendsBarChart, TrendsPieChart } from "./charts/TrendsCharts";
import { RevenueBarChart, RevenuePieChart } from "./charts/RevenueCharts";
import { ComplianceDashboard } from "./charts/ComplianceDashboard";
import { AnalyticsUpgradeState } from "./charts/AnalyticsUpgradeState";

interface AnalyticsPageUIProps {
  overview?: AnalyticsOverview;
  diseaseTrends: DiseaseTrend[];
  revenueByCPT: RevenueCPT[];
  complianceMetrics: ComplianceMetric[];
  isLoading: boolean;
  trendsLoading: boolean;
  revenueLoading: boolean;
  complianceLoading: boolean;
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
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <FeatureGate
      feature={Feature.ADVANCED_ANALYTICS}
      fallback={<AnalyticsUpgradeState />}
    >
      <div className="flex-1 space-y-6 p-4 md:p-6">
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
            value={`₹${overview?.revenueThisMonth?.toLocaleString() || 0}`}
            growth={overview?.revenueGrowth || 0}
            icon={DollarSign}
          />
        </div>

        <Tabs defaultValue="disease-trends" className="space-y-4">
          <TabsList>
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
    <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
    <p className="text-muted-foreground">
      Insights and performance metrics for your clinic
    </p>
  </div>
);
