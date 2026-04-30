"use client";

import { useCallback, useEffect, useState } from "react";
import {
  billingAPI,
  BillingMetrics,
  PaymentRecord,
  SubscriptionOverview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarPlus,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Mail,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { differenceInDays, format, formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  ACTIVE: "badge-success",
  TRIAL: "badge-info",
  PAST_DUE: "badge-warning",
  GRACE_PERIOD: "badge-warning",
  CANCELLED: "badge-danger",
  EXPIRED: "badge-muted",
  SCHEDULED_DOWNGRADE: "tier-pro",
};

const tierColors: Record<string, string> = {
  CAPTURE: "tier-capture",
  CORE: "tier-core",
  PLUS: "tier-plus",
  PRO: "tier-pro",
  ENTERPRISE: "tier-enterprise",
};

export default function BillingDashboard() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionOverview[]>(
    [],
  );
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();

  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [billingCycleFilter, setBillingCycleFilter] = useState<string>("all");

  const [extendGraceDialog, setExtendGraceDialog] = useState<{
    open: boolean;
    subscription?: SubscriptionOverview;
  }>({ open: false });
  const [extendDays, setExtendDays] = useState(3);
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const results = await Promise.allSettled([
        billingAPI.getMetrics(),
        billingAPI.getSubscriptions({
          tier: tierFilter !== "all" ? tierFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          billingCycle:
            billingCycleFilter !== "all" ? billingCycleFilter : undefined,
        }),
        billingAPI.getPayments({}),
      ]);

      if (results[0].status === "fulfilled") {
        setMetrics(results[0].value);
      } else {
        setMetrics(null);
      }

      if (results[1].status === "fulfilled") {
        setSubscriptions(results[1].value);
      } else {
        setSubscriptions([]);
      }

      if (results[2].status === "fulfilled") {
        setPayments(results[2].value);
      } else {
        setPayments([]);
      }
    } catch (error) {
      void error;
      setMetrics(null);
      setSubscriptions([]);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tierFilter, statusFilter, billingCycleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSendReminder = async (subscription: SubscriptionOverview) => {
    setSending(true);
    try {
      await billingAPI.sendReminder(subscription.id);
    } catch (error) {
      void error;
    } finally {
      setSending(false);
    }
  };

  const handleExtendGracePeriod = async () => {
    if (!extendGraceDialog.subscription) return;

    setSending(true);
    try {
      await billingAPI.extendGracePeriod(
        extendGraceDialog.subscription.id,
        extendDays,
      );
      setExtendGraceDialog({ open: false });
      setExtendDays(3);
      fetchData();
    } catch (error) {
      void error;
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Dashboard"
        description="Monitor subscriptions, revenue, and payment activity"
        size="compact"
        actions={
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-semibold">Internal billing reminder</p>
            <p className="text-sm text-muted-foreground">
              Keep requested hospital offers in WhatsApp, and do not charge a
              paid Indian plan until GSTIN is captured.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            WhatsApp-first + GST invoice required
          </Badge>
        </CardContent>
      </Card>

      {}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Recurring Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">
                <ArrowUpRight className="inline h-3 w-3" /> MRR
              </span>{" "}
              from active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Annual Recurring Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.arr || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Projected annual revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.activeSubscriptions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-info">
                {metrics?.trialSubscriptions || 0} in trial
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.churnRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  metrics?.churnRate && metrics.churnRate > 0.05
                    ? "text-destructive"
                    : "text-success"
                }
              >
                {metrics?.churnRate && metrics.churnRate > 0.05 ? (
                  <>
                    <ArrowUpRight className="inline h-3 w-3" /> Above target
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="inline h-3 w-3" /> On target
                  </>
                )}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {}
      {((metrics?.expiringSubscriptions?.length || 0) > 0 ||
        (metrics?.gracePeriodSubscriptions?.length || 0) > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {(metrics?.expiringSubscriptions?.length || 0) > 0 && (
            <Card className="border-warning/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <CardTitle className="text-lg">Expiring Soon</CardTitle>
                </div>
                <CardDescription>
                  {metrics?.expiringSubscriptions?.length} subscription(s)
                  expiring in the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.isArray(metrics?.expiringSubscriptions) &&
                    metrics.expiringSubscriptions.slice(0, 3).map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-[var(--radius)] border border-border/70 p-3"
                      >
                        <div>
                          <p className="font-medium">{sub.clinic.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Expires{" "}
                            {formatDistanceToNow(
                              new Date(sub.currentPeriodEnd),
                              {
                                addSuffix: true,
                              },
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(sub)}
                        >
                          <Mail className="mr-2 h-3 w-3" />
                          Remind
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(metrics?.gracePeriodSubscriptions?.length || 0) > 0 && (
            <Card className="border-warning/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <CardTitle className="text-lg">In Grace Period</CardTitle>
                </div>
                <CardDescription>
                  {metrics?.gracePeriodSubscriptions?.length} subscription(s) in
                  grace period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.isArray(metrics?.gracePeriodSubscriptions) &&
                    metrics.gracePeriodSubscriptions.slice(0, 3).map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-[var(--radius)] border border-border/70 p-3"
                      >
                        <div>
                          <p className="font-medium">{sub.clinic.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {differenceInDays(
                              new Date(sub.currentPeriodEnd),
                              new Date(),
                            )}{" "}
                            days remaining
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExtendGraceDialog({
                              open: true,
                              subscription: sub,
                            })
                          }
                        >
                          <CalendarPlus className="mr-2 h-3 w-3" />
                          Extend
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscriptions by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics?.subscriptionsByTier || {}).map(
                ([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={tierColors[tier] || tierColors.CAPTURE}>
                        {tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${((count as number) / Math.max(metrics?.activeSubscriptions || 1, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">
                        {count as number}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscriptions by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics?.subscriptionsByStatus || {}).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className={statusColors[status] || statusColors.ACTIVE}
                      >
                        {status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${((count as number) / Math.max(metrics?.activeSubscriptions || 1, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">
                        {count as number}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <Building2 className="mr-2 h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <Activity className="mr-2 h-4 w-4" />
            Revenue Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          {}
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="CAPTURE">Capture</SelectItem>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="PLUS">Plus</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="PAST_DUE">Past Due</SelectItem>
                  <SelectItem value="GRACE_PERIOD">Grace Period</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select
                value={billingCycleFilter}
                onValueChange={setBillingCycleFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Billing cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-8"
                      >
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {subscription.clinic.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subscription.clinic.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tierColors[subscription.tier] ||
                              tierColors.CAPTURE
                            }
                          >
                            {subscription.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusColors[subscription.status] ||
                              statusColors.ACTIVE
                            }
                          >
                            {subscription.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {subscription.billingCycle}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(
                              subscription.amount,
                              subscription.currency,
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(
                              new Date(subscription.currentPeriodEnd),
                              "MMM d, yyyy",
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {subscription.clinic.referralCreditsMonths > 0 && (
                            <Badge variant="outline" className="text-success">
                              {subscription.clinic.referralCreditsMonths} mo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendReminder(subscription)}
                              disabled={sending}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            {subscription.status === "GRACE_PERIOD" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setExtendGraceDialog({
                                    open: true,
                                    subscription,
                                  })
                                }
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                Transaction history across all clinics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gateway ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <span className="text-sm">
                            {format(
                              new Date(payment.paidAt || payment.createdAt),
                              "MMM d, yyyy HH:mm",
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">
                            {payment.subscription.clinic.name}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tierColors[payment.subscription.tier] ||
                              tierColors.CAPTURE
                            }
                          >
                            {payment.subscription.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              payment.status === "SUCCESS"
                                ? "badge-success"
                                : payment.status === "PENDING"
                                  ? "badge-warning"
                                  : "badge-danger"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs text-muted-foreground">
                            {payment.gatewayPaymentId || "-"}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Month</CardTitle>
              <CardDescription>Monthly revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.revenueByMonth?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No revenue data available
                  </p>
                ) : (
                  metrics?.revenueByMonth?.map((data, index) => {
                    const maxRevenue = Math.max(
                      ...(metrics?.revenueByMonth?.map((d) => d.revenue) || [
                        1,
                      ]),
                    );
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-20 text-sm font-medium">
                          {data.month}
                        </span>
                        <div className="flex-1">
                          <div className="h-8 rounded-md bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary flex items-center justify-end pr-2"
                              style={{
                                width: `${(data.revenue / maxRevenue) * 100}%`,
                              }}
                            >
                              <span className="text-xs text-primary-foreground font-medium">
                                {formatCurrency(data.revenue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {}
      <Dialog
        open={extendGraceDialog.open}
        onOpenChange={(open) => setExtendGraceDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Grace Period</DialogTitle>
            <DialogDescription>
              Extend the grace period for{" "}
              {extendGraceDialog.subscription?.clinic.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="days" className="text-right">
                Days
              </Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={30}
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 3)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendGraceDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button onClick={handleExtendGracePeriod} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
