"use client";

import { useState } from "react";
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
import { apiHooks } from "@/lib/api-hooks";
import { useClinic } from "@/lib/clinic-context";
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
import { FeatureGate } from "@/components/common/feature-gate";
import { Feature } from "@/lib/stores/permission-store";

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

export default function AnalyticsPage() {
  const { clinicId } = useClinic();
  const [dateRange] = useState({ start: "", end: "" });

  // React Query hooks
  const { data: overview, isLoading: overviewLoading } =
    apiHooks.useAnalyticsOverview();
  const { data: diseaseTrends = [], isLoading: trendsLoading } =
    apiHooks.useDiseaseTrends(
      clinicId || "default",
      dateRange.start,
      dateRange.end,
    );
  const { data: revenueByCPT = [], isLoading: revenueLoading } =
    apiHooks.useRevenueByCPT(
      clinicId || "default",
      dateRange.start,
      dateRange.end,
    );
  const { data: complianceMetrics = [], isLoading: complianceLoading } =
    apiHooks.useComplianceMetrics(
      clinicId || "default",
      dateRange.start,
      dateRange.end,
    );

  const loading = overviewLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <FeatureGate
      feature={Feature.ADVANCED_ANALYTICS}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            Advanced Analytics Dashboard
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Get comprehensive insights into your clinic performance with
            advanced analytics, disease trends, revenue analysis, and compliance
            metrics. Available for Pro and Enterprise tiers.
          </p>
          <Button asChild>
            <Link href="/settings?tab=subscription">Upgrade to Pro</Link>
          </Button>
        </div>
      }
    >
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
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

        {/* Overview Stats */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Patients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.totalPatients || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {overview && overview.patientGrowth > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" /> +
                    {overview.patientGrowth}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />{" "}
                    {overview?.patientGrowth}%
                  </>
                )}
                <span className="ml-1">from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New Patients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.newPatientsThisMonth || 0}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.appointmentsThisMonth || 0}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{overview?.revenueThisMonth?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {overview && overview.revenueGrowth > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" /> +
                    {overview.revenueGrowth}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />{" "}
                    {overview?.revenueGrowth}%
                  </>
                )}
                <span className="ml-1">from last month</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="disease-trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="disease-trends">Disease Trends</TabsTrigger>
            <TabsTrigger value="cpt-revenue">CPT Revenue</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          {/* Disease Trends Tab */}
          <TabsContent value="disease-trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Diagnoses by ICD Code</CardTitle>
                  <CardDescription>
                    Most common diagnoses in your clinic
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {trendsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : diseaseTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diseaseTrends.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="disease"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="count"
                          fill="#8884d8"
                          name="Patient Count"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Activity className="h-12 w-12 mb-4 opacity-50" />
                      <p>No disease trend data available</p>
                      <p className="text-sm">
                        Start coding diagnoses to see trends
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Disease Distribution</CardTitle>
                  <CardDescription>
                    Percentage breakdown of diagnoses
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {trendsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : diseaseTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={diseaseTrends.slice(0, 8)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ payload }) =>
                            `${payload.disease}: ${payload.percentage}%`
                          }
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {diseaseTrends.slice(0, 8).map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Activity className="h-12 w-12 mb-4 opacity-50" />
                      <p>No distribution data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CPT Revenue Tab */}
          <TabsContent value="cpt-revenue" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Procedure Code</CardTitle>
                  <CardDescription>
                    Top revenue-generating procedures
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {revenueLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : revenueByCPT.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByCPT.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="cptCode"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          fill="#00C49F"
                          name="Revenue (₹)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                      <p>No revenue data available</p>
                      <p className="text-sm">
                        Start coding procedures to see revenue breakdown
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Procedure Volume</CardTitle>
                  <CardDescription>
                    Most frequently performed procedures
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {revenueLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : revenueByCPT.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueByCPT.slice(0, 8)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ payload }) =>
                            `${payload.cptCode}: ${payload.count}`
                          }
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {revenueByCPT.slice(0, 8).map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Activity className="h-12 w-12 mb-4 opacity-50" />
                      <p>No procedure volume data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {complianceLoading ? (
                <div className="col-span-3 flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : complianceMetrics.length > 0 ? (
                complianceMetrics.map((metric, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {metric.metric}
                      </CardTitle>
                      {metric.status === "good" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metric.value}%</div>
                      <p className="text-xs text-muted-foreground">
                        {metric.status === "good"
                          ? "Meeting standards"
                          : "Needs improvement"}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-3">
                  <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Activity className="h-12 w-12 mb-4 opacity-50" />
                    <p>No compliance data available</p>
                    <p className="text-sm">
                      Compliance metrics will appear as you code visits
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {!complianceLoading && complianceMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Metrics Overview</CardTitle>
                  <CardDescription>
                    Coding quality and timeliness metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={complianceMetrics}>
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
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
