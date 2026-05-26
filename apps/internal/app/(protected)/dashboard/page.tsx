"use client";

import { useCallback } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { useAuth } from "@/lib/auth/auth";
import {
  type InternalDashboardStats as StatsData,
  useInternalBillingMetrics,
  useInternalClinics,
  useInternalDashboardStats,
} from "@workspace/data-access/internal";
import { ClinicList } from "@/features/dashboard/components/clinic-list";
import {
  BarChart3,
  Building2,
  DollarSign,
  FileText,
  Pill,
  Search,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

export default function InternalDashboard() {
  const defaultStats: StatsData = {
    clinics: 0,
    users: 0,
    doctors: 0,
    patients: 0,
    invoices: 0,
    prescriptions: 0,
  };
  const { token, isLoading } = useAuth();

  const clinicsQuery = useInternalClinics(token, "list");
  const statsQuery = useInternalDashboardStats(token);
  const billingQuery = useInternalBillingMetrics(token);

  const clinics = clinicsQuery.data ?? [];
  const stats = statsQuery.data ?? defaultStats;
  const billing = billingQuery.data ?? null;
  const hasError = Boolean(
    clinicsQuery.error || statsQuery.error || billingQuery.error,
  );
  const errorSource =
    clinicsQuery.error ?? statsQuery.error ?? billingQuery.error ?? null;
  const errorMessage = errorSource
    ? getUserFacingErrorMessage(errorSource, {
        context: "load",
        fallback:
          "We could not load this dashboard. Please refresh and try again.",
      })
    : "We could not load this dashboard. Please refresh and try again.";
  const loading =
    Boolean(token) &&
    (clinicsQuery.isLoading || statsQuery.isLoading || billingQuery.isLoading);

  const loadData = useCallback(async () => {
    await Promise.all([
      clinicsQuery.refetch(),
      statsQuery.refetch(),
      billingQuery.refetch(),
    ]);
  }, [billingQuery, clinicsQuery, statsQuery]);

  const trends = stats.trends || {
    clinicsThisMonth: 0,
    usersThisMonth: 0,
    doctorsThisMonth: 0,
    patientsThisMonth: 0,
    invoicesPercentChange: 0,
    prescriptionsPercentChange: 0,
  };

  const renderTrend = (value: number, isPercentage: boolean = false) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? "text-success" : "text-destructive";
    const prefix = isPositive ? "+" : "";
    const suffix = isPercentage ? "%" : "";

    return (
      <p className="text-xs text-muted-foreground flex items-center mt-1">
        <Icon className={`h-3 w-3 mr-1 ${colorClass}`} />
        <span className={colorClass}>
          {prefix}
          {value}
          {suffix}
        </span>
        <span className="ml-1">
          {isPercentage ? "vs last month" : "this month"}
        </span>
      </p>
    );
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const tierColors: Record<string, string> = {
    CAPTURE: "bg-muted",
    CORE: "bg-info",
    PLUS: "bg-success",
    PRO: "bg-primary",
    CLINIC: "bg-processing",
    ENTERPRISE: "bg-warning",
  };

  const tierEntries = billing?.subscriptionsByTier
    ? Object.entries(billing.subscriptionsByTier).sort((a, b) => b[1] - a[1])
    : [];
  const totalTierCount = tierEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-8">
      {isLoading && (
        <div className="surface-warning rounded-[var(--radius)] p-4">
          <p className="text-sm">Loading authentication…</p>
        </div>
      )}
      {hasError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-destructive">
                We could not load this dashboard
              </p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={() => void loadData()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {billing && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {formatCurrency(billing.mrr)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ARR: {formatCurrency(billing.arr)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscriptions
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {billing.activeSubscriptions}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Churn: {(billing.churnRate * 100).toFixed(1)}% (30d)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tier Distribution
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {tierEntries.slice(0, 4).map(([tier, count]) => (
                  <div key={tier} className="flex items-center gap-2">
                    <div className="w-16 text-xs text-muted-foreground truncate">
                      {tier}
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tierColors[tier] || "bg-primary"}`}
                        style={{
                          width: `${totalTierCount > 0 ? (count / totalTierCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="w-6 text-xs text-right font-medium">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Facilities
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {stats.clinics}
            </div>
            {renderTrend(trends.clinicsThisMonth)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {stats.doctors}
            </div>
            {renderTrend(trends.doctorsThisMonth)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {stats.patients}
            </div>
            {renderTrend(trends.patientsThisMonth)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {stats.invoices}
            </div>
            {renderTrend(trends.invoicesPercentChange, true)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {stats.prescriptions}
            </div>
            {renderTrend(trends.prescriptionsPercentChange, true)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Facilities</CardTitle>
              <CardDescription>
                All registered facilities on the platform
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Enter facility name" className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ClinicList clinics={clinics} loading={loading} onUpdate={loadData} />
        </CardContent>
      </Card>
    </div>
  );
}
