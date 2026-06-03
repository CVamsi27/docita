"use client";

import { useBillingDashboard } from "./use-billing-dashboard";
import { BillingMetricsGrid } from "./BillingMetricsGrid";
import { BillingGracePeriodDialog } from "./BillingGracePeriodDialog";

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
  Activity,
  AlertTriangle,
  Building2,
  CalendarPlus,
  Clock,
  CreditCard,
  Mail,
  RefreshCw,
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
  const {
    refreshing,
    tierFilter,
    setTierFilter,
    statusFilter,
    setStatusFilter,
    billingCycleFilter,
    setBillingCycleFilter,
    extendGraceDialog,
    setExtendGraceDialog,
    extendDays,
    setExtendDays,
    sending,
    metrics,
    subscriptions,
    payments,
    pageStatus,
    errorMessage,
    handleRefresh,
    handleSendReminder,
    handleExtendGracePeriod,
    refetchBilling,
  } = useBillingDashboard();

  return (
    <AppPageScaffold
      header={
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

        <BillingMetricsGrid metrics={metrics} />

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
                    {metrics?.gracePeriodSubscriptions?.length} subscription(s)
                    in grace period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(metrics?.gracePeriodSubscriptions) &&
                      metrics.gracePeriodSubscriptions
                        .slice(0, 3)
                        .map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-[var(--radius)] border border-border/70 p-3"
                          >
                            <div>
                              <p className="font-medium">{sub.clinic.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {differenceInDays(
                                  sub.currentPeriodEnd,
                                  new Date(),
                                )}
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
                      <div
                        key={tier}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getInternalTierBadgeClass(tier)}
                          >
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
              <CardTitle className="text-lg">
                Subscriptions by Status
              </CardTitle>
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
                            className={
                              statusColors[status] || statusColors.ACTIVE
                            }
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
                    <SelectItem value="all">All Tiers</SelectItem>
                    {getInternalTierFilterOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
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
                              className={getInternalTierBadgeClass(
                                subscription.tier,
                              )}
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
                            {subscription.clinic
                              .referralCreditsMonths > 0 && (
                              <Badge
                                variant="outline"
                                className="text-success"
                              >
                                {subscription.clinic.referralCreditsMonths} mo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleSendReminder(subscription)
                                }
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
                            <p className="font-medium">
                              {payment.clinicName}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getInternalTierBadgeClass(
                                payment.planLabel,
                              )}
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
                <CardDescription>
                  Monthly revenue trends
                </CardDescription>
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
                        ...(metrics?.revenueByMonth?.map(
                          (d) => d.revenue,
                        ) || [1]),
                      );
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-4"
                        >
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

      <BillingGracePeriodDialog
        open={extendGraceDialog.open}
        onOpenChange={(open) => setExtendGraceDialog({ open })}
        subscriptionName={
          extendGraceDialog.subscription?.clinic.name ?? ""
        }
        extendDays={extendDays}
        onExtendDaysChange={setExtendDays}
        sending={sending}
        onConfirm={handleExtendGracePeriod}
      />
    </AppPageScaffold>
  );
}
