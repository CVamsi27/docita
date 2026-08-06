import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPageScaffold, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, PageHeader } from "@workspace/ui/components";
import { Activity, Calendar, DollarSign, Download, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import type { InternalAnalyticsData, InternalBillingMetrics } from "@workspace/data-access/internal";
import { downloadInternalAnalyticsExport } from "@workspace/data-access/internal";
import { API_URL } from "@/lib/api/api-config";
import { internalSession } from "@/lib/auth/session";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { formatCurrency } from "@/lib/formatters";
import { apiGet } from "@/lib/api/api-client";
import { BillingOverviewCards } from "../components/analytics-billing-cards";
import { MetricCardsGrid } from "../components/analytics-metric-cards";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

function formatChange(value: number | undefined | null): string | undefined {
  if (!value) return undefined;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function resolveTrend(value: number | undefined | null): "up" | "down" | "neutral" {
  if (!value) return "neutral";
  return value > 0 ? "up" : "down";
}

function buildMetrics(data: InternalAnalyticsData | null) {
  const icons = {
    revenue: <DollarSign className="h-6 w-6" />,
    appointments: <Activity className="h-6 w-6" />,
    patients: <Users className="h-6 w-6" />,
    invoice: <TrendingUp className="h-6 w-6" />,
  };
  return [
    {
      title: "Total Revenue",
      value: data ? `\u20b9${((data.revenue || 0) / 1000).toFixed(1)}K` : "\u20b90",
      change: formatChange(data?.revenueChange),
      trend: resolveTrend(data?.revenueChange),
      icon: icons.revenue,
    },
    {
      title: "Appointments",
      value: String(data?.appointments || 0),
      change: formatChange(data?.appointmentsChange),
      trend: resolveTrend(data?.appointmentsChange),
      icon: icons.appointments,
    },
    {
      title: "New Patients",
      value: String(data?.newPatients || 0),
      change: formatChange(data?.patientsChange),
      trend: resolveTrend(data?.patientsChange),
      icon: icons.patients,
    },
    {
      title: "Avg Invoice Value",
      value: data ? `\u20b9${(data.avgInvoiceValue || 0).toFixed(2)}` : "\u20b90.00",
      change: formatChange(data?.invoiceValueChange),
      trend: resolveTrend(data?.invoiceValueChange),
      icon: icons.invoice,
    },
  ];
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [data, setData] = useState<InternalAnalyticsData | null>(null);
  const [billing, setBilling] = useState<InternalBillingMetrics | null>(null);

  const analyticsParams = useMemo(() => new URLSearchParams({ period }).toString(), [period]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [analyticsData, billingData] = await Promise.all([
        apiGet<InternalAnalyticsData>(`/api/internal/analytics?${analyticsParams}`),
        apiGet<InternalBillingMetrics>("/api/internal/billing/metrics"),
      ]);
      setData(analyticsData);
      setBilling(billingData);
    } catch {
      setError("We could not load this analytics view. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [analyticsParams]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const metrics = useMemo(() => buildMetrics(data), [data]);

  const tierEntries = useMemo<[string, number][]>(() =>
    billing?.subscriptionsByTier
      ? Object.entries(billing.subscriptionsByTier).sort((a, b) => b[1] - a[1])
      : [],
  [billing]);

  const totalTierCount = useMemo(() => tierEntries.reduce((sum, [, count]) => sum + count, 0), [tierEntries]);

  const revenueByMonth = useMemo(() => billing?.revenueByMonth ?? [], [billing]);
  const maxRevenue = useMemo(() => Math.max(...revenueByMonth.map((row) => row.revenue), 1), [revenueByMonth]);

  const handleExport = useCallback(async () => {
    const token = internalSession.getToken();
    if (!token) return;
    try {
      const blob = await downloadInternalAnalyticsExport(API_URL, { Authorization: `Bearer ${token}` }, { period });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      showUserFacingErrorToast(new Error("analytics-export-failed"), "We could not export the report. Please try again.");
    }
  }, [period]);

  const pageStatus: "loading" | "error" | "success" = error ? "error" : loading ? "loading" : "success";

  return (
    <AppPageScaffold header={<PageHeader title="Analytics" description="View clinic performance metrics" size="compact" />}>
      <DataState status={pageStatus} loadingMessage="Loading analytics\u2026" errorMessage={error} onRetry={() => { void fetchData(); }}>
        <div className="space-y-6 md:space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <Button key={p} size="sm" variant={period === p ? "default" : "outline"}
                  aria-pressed={period === p} onClick={() => { setPeriod(p); }}>
                  {PERIOD_LABELS[p]}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{PERIOD_LABELS[period]} view</span>
            </div>
            <Button onClick={() => { void handleExport(); }}><Download className="h-4 w-4 mr-2" /> Export Report</Button>
          </div>

          {billing && (
            <BillingOverviewCards
              billing={{ mrr: billing.mrr, arr: billing.arr, activeSubscriptions: billing.activeSubscriptions, churnRate: billing.churnRate }}
              formatCurrency={formatCurrency}
            />
          )}

          <MetricCardsGrid metrics={metrics} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Monthly Recurring Revenue</CardTitle><CardDescription>Revenue trend over the last 12 months</CardDescription></CardHeader>
              <CardContent>
                {revenueByMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No revenue data available yet.</p>
                ) : (
                  <div className="flex items-end gap-2 h-40 pt-4">
                    {revenueByMonth.map((row) => (
                      <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-primary/20 hover:bg-primary/30 transition-colors"
                          style={{ height: `${String(Math.max((row.revenue / maxRevenue) * 100, 4))}%` }} />
                        <span className="text-[var(--fs-2xs)] text-muted-foreground">{row.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Subscription Distribution</CardTitle><CardDescription>Active subscriptions by tier</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {tierEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No subscription data available yet.</p>
                ) : tierEntries.map(([tier, count]) => (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="w-28 text-sm">{tier}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${String(totalTierCount ? Math.round((count / totalTierCount) * 100) : 0)}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm text-muted-foreground">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </DataState>
    </AppPageScaffold>
  );
}
