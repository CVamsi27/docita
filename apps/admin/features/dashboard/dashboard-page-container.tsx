"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Building2,
  Users,
  User,
  FileText,
  Pill,
  Search,
  TrendingUp,
  TrendingDown,
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
    const colorClass = isPositive ? "text-green-500" : "text-red-500";
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
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Loading authentication... If this persists, please log in again.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Monitor and manage all clinics across the platform.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CreateClinicDialog onClinicCreated={refetch} />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clinics}</div>
            {renderTrend(trends.clinicsThisMonth)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.doctors}</div>
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
            <div className="text-2xl font-bold">{stats.patients}</div>
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
            <div className="text-2xl font-bold">{stats.invoices}</div>
            {renderTrend(trends.invoicesPercentChange, true)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prescriptions}</div>
            {renderTrend(trends.prescriptionsPercentChange, true)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Clinics</CardTitle>
              <CardDescription>
                All registered clinics on the platform
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clinics..." className="pl-8" />
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
