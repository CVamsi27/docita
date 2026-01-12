
import React, { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Feature,
  FeatureGate,
} from "@/features/_shared/components/feature-gate";
import type { AnalyticsOverview, DiseaseTrend, RevenueCPT, ComplianceMetric } from "../hooks/use-analytics-logic";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#FF6B9D",
  "#C084FC",
  "#34D399",
];

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
            <ComplianceDashboard metrics={complianceMetrics} loading={complianceLoading} />
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

const OverviewCard = ({ title, value, growth, icon: Icon, subtitle }: { 
  title: string; 
  value: string | number; 
  growth?: number; 
  icon: React.ElementType; 
  subtitle?: string; 
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {growth !== undefined ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {growth > 0 ? (
            <>
              <TrendingUp className="h-3 w-3 text-green-600" /> +{growth}%
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-red-600" /> {growth}%
            </>
          )}
          <span className="ml-1">from last month</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

const TrendsBarChart = ({ data, loading }: { data: DiseaseTrend[]; loading: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>Top Diagnoses by ICD Code</CardTitle>
      <CardDescription>Most common diagnoses in your clinic</CardDescription>
    </CardHeader>
    <CardContent className="h-[400px]">
      {loading ? <LoadingSpinner /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="disease" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Patient Count" />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyState icon={Activity} label="No disease trend data available" sublabel="Start coding diagnoses to see trends" />}
    </CardContent>
  </Card>
);

const TrendsPieChart = ({ data, loading }: { data: DiseaseTrend[]; loading: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>Disease Distribution</CardTitle>
      <CardDescription>Percentage breakdown of diagnoses</CardDescription>
    </CardHeader>
    <CardContent className="h-[400px]">
      {loading ? <LoadingSpinner /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.slice(0, 8)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ payload }) => `${payload.disease}: ${payload.percentage}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="count"
            >
              {data.slice(0, 8).map((_entry, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : <EmptyState icon={Activity} label="No distribution data available" />}
    </CardContent>
  </Card>
);

const RevenueBarChart = ({ data, loading }: { data: RevenueCPT[]; loading: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>Revenue by Procedure Code</CardTitle>
      <CardDescription>Top revenue-generating procedures</CardDescription>
    </CardHeader>
    <CardContent className="h-[400px]">
      {loading ? <LoadingSpinner /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="cptCode" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#00C49F" name="Revenue (₹)" />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyState icon={DollarSign} label="No revenue data available" sublabel="Start coding procedures to see revenue breakdown" />}
    </CardContent>
  </Card>
);

const RevenuePieChart = ({ data, loading }: { data: RevenueCPT[]; loading: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>Procedure Volume</CardTitle>
      <CardDescription>Most frequently performed procedures</CardDescription>
    </CardHeader>
    <CardContent className="h-[400px]">
      {loading ? <LoadingSpinner /> : data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.slice(0, 8)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ payload }) => `${payload.cptCode}: ${payload.count}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="count"
            >
              {data.slice(0, 8).map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : <EmptyState icon={Activity} label="No procedure volume data available" />}
    </CardContent>
  </Card>
);

const ComplianceDashboard = ({ metrics, loading }: { metrics: ComplianceMetric[]; loading: boolean }) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">
      {loading ? <LoadingSpinner className="col-span-3 h-64" /> : metrics.length > 0 ? (
        metrics.map((metric, index: number) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
              {metric.status === "good" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}%</div>
              <p className="text-xs text-muted-foreground">
                {metric.status === "good" ? "Meeting standards" : "Needs improvement"}
              </p>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="col-span-3">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p>No compliance data available</p>
            <p className="text-sm">Compliance metrics will appear as you code visits</p>
          </CardContent>
        </Card>
      )}
    </div>

    {!loading && metrics.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Metrics Overview</CardTitle>
          <CardDescription>Coding quality and timeliness metrics</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Compliance %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )}
  </div>
);

const AnalyticsUpgradeState = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
    <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
    <h2 className="text-2xl font-semibold mb-2">Advanced Analytics Dashboard</h2>
    <p className="text-muted-foreground mb-4 max-w-md">
      Get comprehensive insights into your clinic performance with advanced analytics, disease trends, revenue analysis, and compliance metrics. Available for Pro and Enterprise tiers.
    </p>
    <Button asChild>
      <Link href="/settings?tab=subscription">Upgrade to Pro</Link>
    </Button>
  </div>
);

const LoadingSpinner = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center h-full", className)}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const EmptyState = ({ icon: Icon, label, sublabel }: { icon: React.ElementType; label: string; sublabel?: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
    <Icon className="h-12 w-12 mb-4 opacity-50" />
    <p>{label}</p>
    {sublabel && <p className="text-sm">{sublabel}</p>}
  </div>
);

import { cn } from "@workspace/ui/lib/utils";
