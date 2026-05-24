"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useMemo, useState } from "react";
import { billingAPI } from "@/lib/api/api";
import {
  type InternalSubscriptionOverview as SubscriptionOverview,
  useInternalBillingMetrics,
  useInternalBillingPayments,
  useInternalBillingSubscriptions,
} from "@workspace/data-access/internal";
import { useAuth } from "@/lib/auth/auth";
import {
  getInternalTierBadgeClass,
  getInternalTierFilterOptions,
} from "@/lib/tier-display";
import {
  DEFAULT_CURRENCY,
  differenceInDays,
  formatCurrency,
  formatDate,
  formatDistanceToNow,
  getUserFacingErrorMessage,
} from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
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
  Mail,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
const statusColors: Record<string, string> = {
  ACTIVE: "badge-success",
  TRIAL: "badge-info",
  PAST_DUE: "badge-warning",
  GRACE_PERIOD: "badge-warning",
  CANCELLED: "badge-danger",
  EXPIRED: "badge-muted",
  SCHEDULED_DOWNGRADE: "tier-pro",
};

export default function BillingDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const { token, isLoading: authLoading } = useAuth();

  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [billingCycleFilter, setBillingCycleFilter] = useState<string>("all");

  const [extendGraceDialog, setExtendGraceDialog] = useState<{
    open: boolean;
    subscription?: SubscriptionOverview;
  }>({ open: false });
  const [extendDays, setExtendDays] = useState(3);
  const [sending, setSending] = useState(false);

  const subscriptionFilters = useMemo(
    () => ({
      tier: tierFilter !== "all" ? tierFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      billingCycle:
        billingCycleFilter !== "all" ? billingCycleFilter : undefined,
    }),
    [tierFilter, statusFilter, billingCycleFilter],
  );
  const subscriptionFiltersKey = useMemo(
    () => JSON.stringify(subscriptionFilters),
    [subscriptionFilters],
  );

  const metricsQuery = useInternalBillingMetrics(token);
  const subscriptionsQuery = useInternalBillingSubscriptions(
    token,
    subscriptionFiltersKey,
    subscriptionFilters,
  );
  const paymentsQuery = useInternalBillingPayments(token, "default", {});

  const metrics = metricsQuery.data ?? null;
  const subscriptions = subscriptionsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const loading =
    authLoading ||
    (Boolean(token) &&
      (metricsQuery.isLoading ||
        subscriptionsQuery.isLoading ||
        paymentsQuery.isLoading));

  const queryError =
    metricsQuery.error ?? subscriptionsQuery.error ?? paymentsQuery.error;
  const errorMessage = queryError
    ? getUserFacingErrorMessage(queryError, {
        context: "load",
        fallback:
          "We could not load billing data. Please refresh and try again.",
      })
    : undefined;
  const pageStatus = loading
    ? "loading"
    : queryError
      ? "error"
      : "success";

  const refetchBilling = async () => {
    await Promise.all([
      metricsQuery.refetch(),
      subscriptionsQuery.refetch(),
      paymentsQuery.refetch(),
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchBilling();
    } finally {
      setRefreshing(false);
    }
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
      await refetchBilling();
    } catch (error) {
      void error;
    } finally {
      setSending(false);
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Billing dashboard"
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
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading billing dashboard…"
        errorMessage={errorMessage}
        onRetry={() => void refetchBilling()}
      >

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Recurring Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {formatCurrency(metrics?.mrr || 0, {
                currency: DEFAULT_CURRENCY,
                fractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">
                <ArrowUpRight className="inline h-3 w-3" /> MRR
              </span>
              <span className="ml-1">from active subscriptions</span>
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
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {formatCurrency(metrics?.arr || 0, {
                currency: DEFAULT_CURRENCY,
                fractionDigits: 0,
              })}
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
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
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
            <CardTitle className="text-sm font-medium">Churn rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
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

      {((metrics?.expiringSubscriptions?.length || 0) > 0 ||
        (metrics?.gracePeriodSubscriptions?.length || 0) > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {(metrics?.expiringSubscriptions?.length || 0) > 0 && (
            <Card className="border-warning/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <CardTitle className="text-lg">Expiring soon</CardTitle>
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
                            Expires
                            <span className="ml-1">
                              {formatDistanceToNow(sub.currentPeriodEnd)}
                            </span>
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
                            {differenceInDays(sub.currentPeriodEnd, new Date())}
                            <span className="ml-1">days remaining</span>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscriptions by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics?.subscriptionsByTier || {}).map(
                ([tier, count]) => {
                  const subscriptionCount =
                    typeof count === "number" ? count : Number(count) || 0;
                  return (
                  <div key={tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getInternalTierBadgeClass(tier)}>
                        {tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(subscriptionCount / Math.max(metrics?.activeSubscriptions || 1, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">
                        {subscriptionCount}
                      </span>
                    </div>
                  </div>
                  );
                },
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
                ([status, count]) => {
                  const subscriptionCount =
                    typeof count === "number" ? count : Number(count) || 0;
                  return (
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
                            width: `${(subscriptionCount / Math.max(metrics?.activeSubscriptions || 1, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">
                        {subscriptionCount}
                      </span>
                    </div>
                  </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tiers</SelectItem>
                  {getInternalTierFilterOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="PAST_DUE">Past due</SelectItem>
                  <SelectItem value="GRACE_PERIOD">Grace period</SelectItem>
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
                  <SelectItem value="all">All cycles</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing cycle</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period end</TableHead>
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
                              getInternalTierBadgeClass(subscription.tier)
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
                            {formatCurrency(subscription.amount, {
                              currency: subscription.currency,
                              fractionDigits: 0,
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(
                              subscription.currentPeriodEnd,
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
              <CardTitle>Recent payments</CardTitle>
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
                    <TableHead>Plan / service</TableHead>
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
                            {formatDate(
                              payment.paidAt || payment.createdAt,
                              "MMM d, yyyy HH:mm",
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{payment.clinicName}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              getInternalTierBadgeClass(payment.planLabel)
                            }
                            title={payment.description}
                          >
                            {payment.planLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(payment.amount, {
                              currency: payment.currency,
                              fractionDigits: 0,
                            })}
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
                                {formatCurrency(data.revenue, {
                                  currency: DEFAULT_CURRENCY,
                                  fractionDigits: 0,
                                })}
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
      </DataState>

      <Dialog
        open={extendGraceDialog.open}
        onOpenChange={(open) => setExtendGraceDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Grace Period</DialogTitle>
            <DialogDescription>
              Extend the grace period for
              <span className="ml-1">
                {extendGraceDialog.subscription?.clinic.name}
              </span>
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
              {sending && (
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
              )}
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
