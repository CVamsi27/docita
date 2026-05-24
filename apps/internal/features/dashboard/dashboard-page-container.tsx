"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Building2,
  FileText,
  Pill,
  Search,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { ClinicList, CreateClinicDialog } from "@/features/dashboard/components";
import { useDashboardData } from "./use-dashboard-data";

export function DashboardPageContainer() {
  const {
    token,
    clinics,
    stats,
    trends,
    loading,
    hasError,
    errorMessage,
    refetch,
  } = useDashboardData();

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

  const dataStatus = !token || loading
    ? "loading"
    : hasError
      ? "error"
      : "success";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Overview"
          description="Monitor and manage all facilities across the platform."
          size="compact"
          actions={<CreateClinicDialog onClinicCreated={refetch} />}
        />
      }
    >
      <DataState
        status={dataStatus}
        loadingMessage="Loading dashboard…"
        errorMessage={errorMessage}
        onRetry={() => void refetch()}
      >
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
              <CardTitle className="text-sm font-medium">Total doctors</CardTitle>
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
            <ClinicList clinics={clinics} loading={false} onUpdate={refetch} />
          </CardContent>
        </Card>
      </DataState>
    </AppPageScaffold>
  );
}
