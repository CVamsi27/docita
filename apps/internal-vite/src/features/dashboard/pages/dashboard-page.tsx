import { useState, useEffect } from "react";
import { AppPageScaffold, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, Input, PageHeader } from "@workspace/ui/components";
import { Building2, FileText, Pill, Search, TrendingDown, TrendingUp, User, Users } from "lucide-react";
import { ClinicList } from "../components/clinic-list";
import { CreateClinicDialog } from "../components/create-clinic-dialog";
import { defaultDashboardStats, defaultDashboardTrends, type DashboardClinic, type DashboardStats, type DashboardTrends } from "../types";
import { apiGet } from "@/lib/api/api-client";

export function DashboardPage() {
  const [clinics, setClinics] = useState<DashboardClinic[]>([]);
  const [stats, setStats] = useState<DashboardStats>(defaultDashboardStats);
  const [trends, setTrends] = useState<DashboardTrends>(defaultDashboardTrends);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const [clinics, stats] = await Promise.all([
        apiGet<DashboardClinic[]>("/api/internal/clinics"),
        apiGet<DashboardStats & { trends?: DashboardTrends }>("/api/internal/dashboard/stats"),
      ]);
      setClinics(clinics);
      setStats(stats);
      if (stats.trends) setTrends(stats.trends);
    } catch { setHasError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); }, []);

  const renderTrend = (value: number, isPercentage: boolean = false) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <p className="text-xs text-muted-foreground flex items-center mt-1">
        <Icon className={`h-3 w-3 mr-1 ${isPositive ? "text-success" : "text-destructive"}`} />
        <span className={isPositive ? "text-success" : "text-destructive"}>{isPositive ? "+" : ""}{value}{isPercentage ? "%" : ""}</span>
        <span className="ml-1">{isPercentage ? "vs last month" : "this month"}</span>
      </p>
    );
  };

  return (
    <AppPageScaffold header={<PageHeader title="Dashboard" description="Monitor all facilities and platform metrics" size="compact"
      actions={<CreateClinicDialog onClinicCreated={() => { void fetchData(); }} />} />}>
      <DataState status={loading ? "loading" : hasError ? "error" : "success"}
        loadingMessage="Loading dashboard\u2026" errorMessage="We could not load this dashboard. Please refresh and try again."
        onRetry={() => { void fetchData(); }}>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Facilities</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{stats.clinics}</div>{renderTrend(trends.clinicsThisMonth)}</CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Doctors</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{stats.doctors}</div>{renderTrend(trends.doctorsThisMonth)}</CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Patients</CardTitle><User className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{stats.patients}</div>{renderTrend(trends.patientsThisMonth)}</CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Invoices</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{stats.invoices}</div>{renderTrend(trends.invoicesPercentChange, true)}</CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Prescriptions</CardTitle><Pill className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{stats.prescriptions}</div>{renderTrend(trends.prescriptionsPercentChange, true)}</CardContent></Card>
        </div>

        <Card><CardHeader><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><CardTitle>Facilities</CardTitle><CardDescription>All registered facilities and their status</CardDescription></div>
          <div className="relative w-full md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search facilities\u2026" className="pl-8" /></div>
        </div></CardHeader><CardContent><ClinicList clinics={clinics} loading={false} onUpdate={() => { void fetchData(); }} /></CardContent></Card>
      </DataState>
    </AppPageScaffold>
  );
}
