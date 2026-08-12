import { useState, useEffect } from "react";
import { AppPageScaffold, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, PageHeader } from "@workspace/ui/components";
import { Activity, Building2, CreditCard, RefreshCw } from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";
import { apiGet, apiPost } from "@/lib/api/api-client";
import { BillingDashboardTabs } from "../components/billing-dashboard-tabs";

interface Subscription { id: string; clinic: { name: string; email: string; referralCreditsMonths: number }; tier: string; status: string; billingCycle: string; amount: number; currency: string; currentPeriodEnd: string; }
interface Payment { id: string; clinicName: string; planLabel: string; amount: number; currency: string; status: string; paidAt?: string; createdAt: string; gatewayPaymentId?: string; }
interface BillingMetrics { mrr: number; arr: number; activeSubscriptions: number; churnRate: number; revenueByMonth: Array<{ month: string; revenue: number }>; }

export function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const [sending, setSending] = useState(false);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const [subs, pays, met] = await Promise.all([
        apiGet<Subscription[]>("/api/internal/billing/subscriptions"),
        apiGet<Payment[]>("/api/internal/billing/payments"),
        apiGet<BillingMetrics>("/api/internal/billing/metrics"),
      ]);
      setSubscriptions(subs);
      setPayments(pays);
      setMetrics(met);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchBilling(); }, []);

  const handleSendReminder = async (subscription: Subscription) => {
    setSending(true);
    try {
      await apiPost(`/api/internal/billing/subscriptions/${subscription.id}/remind`);
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleExtendGracePeriod = async (subscription: Subscription): Promise<void> => {
    await apiPost(`/api/internal/billing/subscriptions/${subscription.id}/extend-grace`, { days: 7 });
    await fetchBilling();
  };

  return (
    <AppPageScaffold header={<PageHeader title="Billing Dashboard" description="Monitor subscriptions, revenue, and payment activity" size="compact"
      actions={<Button onClick={() => { void fetchBilling(); }} disabled={loading} variant="outline"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>} />}>
      <DataState status={loading ? "loading" : "success"} loadingMessage="Loading billing dashboard…">
        {metrics && (
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card density="compact"><CardHeader className="border-b"><div className="flex items-center justify-between gap-3">
              <div className="space-y-1"><CardTitle>MRR</CardTitle><CardDescription>Recurring monthly revenue</CardDescription></div>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{formatCurrency(metrics.mrr)}</p>
              <p className="text-sm text-muted-foreground">ARR: {formatCurrency(metrics.arr)}</p></CardContent></Card>
            <Card density="compact"><CardHeader className="border-b"><div className="flex items-center justify-between gap-3">
              <div className="space-y-1"><CardTitle>Active Subscriptions</CardTitle><CardDescription>Paid customers across all tiers</CardDescription></div>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{metrics.activeSubscriptions}</p>
              <p className="text-sm text-muted-foreground">Churn: {(metrics.churnRate * 100).toFixed(1)}% (30d)</p></CardContent></Card>
            <Card density="compact"><CardHeader className="border-b"><div className="flex items-center justify-between gap-3">
              <div className="space-y-1"><CardTitle>Revenue</CardTitle><CardDescription>Monthly revenue trend</CardDescription></div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div></CardHeader><CardContent>
              {metrics.revenueByMonth.length > 0 && <p className="text-2xl font-semibold tabular-nums">{formatCurrency(metrics.revenueByMonth[metrics.revenueByMonth.length - 1]?.revenue ?? 0)}</p>}
            </CardContent></Card>
          </div>
        )}

        <BillingDashboardTabs
          subscriptions={subscriptions} payments={payments} sending={sending}
          tierFilter={tierFilter} onTierFilterChange={setTierFilter}
          statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
          billingCycleFilter={cycleFilter} onBillingCycleFilterChange={setCycleFilter}
          onSendReminder={(sub) => { void handleSendReminder(sub); }} onExtendGracePeriod={(sub) => { void handleExtendGracePeriod(sub); }} />
      </DataState>
    </AppPageScaffold>
  );
}
