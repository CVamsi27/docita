"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { PageHeader } from "@workspace/ui/components/page-header";
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
import { CreateClinicDialog } from "@/app/(protected)/dashboard/create-clinic-dialog";
import { ClinicList } from "@/app/(protected)/dashboard/clinic-list";
import { useDashboardData } from "./use-dashboard-data";

export function DashboardPageContainer() {
  const { token, clinics, stats, trends, loading, refetch } =
    useDashboardData();

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

  return (
    <div className="space-y-8">
      {!token && (
        <div className="surface-warning rounded-[var(--radius)] p-4">
          <p className="text-sm">Loading authentication…</p>
        </div>
      )}
      <PageHeader
        title="Overview"
        description="Monitor and manage all facilities across the platform."
        size="compact"
        actions={<CreateClinicDialog onClinicCreated={refetch} />}
      />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Facilities
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{stats.clinics}</div>
            {renderTrend(trends.clinicsThisMonth)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{stats.doctors}</div>
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
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{stats.patients}</div>
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
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{stats.invoices}</div>
            {renderTrend(trends.invoicesPercentChange, true)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{stats.prescriptions}</div>
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
          <ClinicList clinics={clinics} loading={loading} onUpdate={refetch} />
        </CardContent>
      </Card>
    </div>
  );
}
