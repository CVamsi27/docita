"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CreateClinicDialog } from "./create-clinic-dialog";
import { ClinicList } from "./clinic-list";
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

interface StatsData {
  clinics: number;
  users: number;
  doctors: number;
  patients: number;
  invoices: number;
  prescriptions: number;
  trends?: {
    clinicsThisMonth: number;
    usersThisMonth: number;
    doctorsThisMonth: number;
    patientsThisMonth: number;
    invoicesPercentChange: number;
    prescriptionsPercentChange: number;
  };
}

interface BillingMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  activeSubscriptions: number;
  subscriptionsByTier: Record<string, number>;
}

export default function SuperAdminDashboard() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    clinics: 0,
    users: 0,
    doctors: 0,
    patients: 0,
    invoices: 0,
    prescriptions: 0,
  });
  const [billing, setBilling] = useState<BillingMetrics | null>(null);
  const { token, logout } = useAuth();

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [clinicsRes, statsRes, billingRes] = await Promise.all([
        fetch(`${API_URL}/super-admin/clinics`, { headers }),
        fetch(`${API_URL}/super-admin/stats`, { headers }),
        fetch(`${API_URL}/super-admin/billing/metrics`, { headers }),
      ]);

      if (clinicsRes.status === 401 || statsRes.status === 401) {
        logout("Your session has expired. Please log in again.");
        return;
      }

      if (clinicsRes.status === 404 || statsRes.status === 404) {
        logout("Your account has been deleted. Please contact support.");
        return;
      }

      if (clinicsRes.status === 403 || statsRes.status === 403) {
        logout("You no longer have permission to access this resource.");
        return;
      }

      if (clinicsRes.ok) {
        const clinicsData = await clinicsRes.json();
        setClinics(
          Array.isArray(clinicsData) ? clinicsData : clinicsData.items || [],
        );
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (billingRes.ok) setBilling(await billingRes.json());
    } catch (error) {
      void error;
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      {!token && (
        <div className="surface-warning rounded-lg p-4">
          <p className="text-sm">
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
          <CreateClinicDialog onClinicCreated={loadData} />
        </div>
      </div>

      {billing && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
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
              <div className="text-2xl font-bold">
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
          <ClinicList clinics={clinics} loading={loading} onUpdate={loadData} />
        </CardContent>
      </Card>
    </div>
  );
}
