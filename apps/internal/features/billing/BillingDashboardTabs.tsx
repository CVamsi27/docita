"use client";

import type {
  InternalBillingMetrics,
  InternalSubscriptionOverview,
} from "@workspace/data-access/internal";
import type { InternalBillingPaymentItem } from "@workspace/types";
import { useTranslations } from "next-intl";
import { DEFAULT_CURRENCY, formatCurrency, formatDate } from "@workspace/utils";
import { Button } from "@workspace/ui/components/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Badge } from "@workspace/ui/components/indicators/badge";
// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
// jscpd:ignore-end
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import {
  getInternalTierBadgeClass,
  getInternalTierFilterOptions,
} from "@/lib/tier-display";
import {
  Activity,
  Building2,
  CalendarPlus,
  CreditCard,
  Mail,
} from "lucide-react";

interface BillingDashboardTabsProps {
  tierFilter: string;
  statusFilter: string;
  billingCycleFilter: string;
  subscriptions: InternalSubscriptionOverview[];
  payments: InternalBillingPaymentItem[];
  metrics: InternalBillingMetrics | null;
  sending: boolean;
  onTierFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onBillingCycleFilterChange: (value: string) => void;
  onSendReminder: (subscription: InternalSubscriptionOverview) => void;
  onExtendGracePeriod: (subscription: InternalSubscriptionOverview) => void;
}

/**
 * Phase 3 (per-feature): the internal billing dashboard tabs is
 * the apps/internal admin view of all clinic subscriptions, payments,
 * and revenue. Highest-density file in the per-feature conversion
 * backlog (29 literals in the baseline). All chrome (tab labels,
 * table headers, filter labels, status enums, empty states, card
 * titles) resolves through useTranslations("InternalBilling.dashboard").
 *
 * Note: dynamic data like subscription.clinic.name, subscription.tier,
 * formatBillingStatus(subscription.status) and currency formatting
 * stay unchanged — these come from the API and aren't chrome copy.
 */
function useBillingDashboardTranslations() {
  return useTranslations("InternalBilling.dashboard");
}

export function BillingDashboardTabs({
  tierFilter,
  statusFilter,
  billingCycleFilter,
  subscriptions,
  payments,
  metrics,
  sending,
  onTierFilterChange,
  onStatusFilterChange,
  onBillingCycleFilterChange,
  onSendReminder,
  onExtendGracePeriod,
}: BillingDashboardTabsProps) {
  const t = useBillingDashboardTranslations();
  return (
    <Tabs defaultValue="subscriptions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="subscriptions">
          <Building2 className="mr-2 h-4 w-4" />
          {t("tabSubscriptions")}
        </TabsTrigger>
        <TabsTrigger value="payments">
          <CreditCard className="mr-2 h-4 w-4" />
          {t("tabPayments")}
        </TabsTrigger>
        <TabsTrigger value="revenue">
          <Activity className="mr-2 h-4 w-4" />
          {t("tabRevenue")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="subscriptions" className="space-y-4">
        <SubscriptionFilters
          tierFilter={tierFilter}
          statusFilter={statusFilter}
          billingCycleFilter={billingCycleFilter}
          onTierFilterChange={onTierFilterChange}
          onStatusFilterChange={onStatusFilterChange}
          onBillingCycleFilterChange={onBillingCycleFilterChange}
        />
        <SubscriptionsTable
          subscriptions={subscriptions}
          sending={sending}
          onSendReminder={onSendReminder}
          onExtendGracePeriod={onExtendGracePeriod}
        />
      </TabsContent>

      <TabsContent value="payments" className="space-y-4">
        <PaymentsTable payments={payments} />
      </TabsContent>

      <TabsContent value="revenue" className="space-y-4">
        <RevenueTrendsCard metrics={metrics} />
      </TabsContent>
    </Tabs>
  );
}

function SubscriptionFilters({
  tierFilter, statusFilter, billingCycleFilter,
  onTierFilterChange, onStatusFilterChange, onBillingCycleFilterChange,
}: {
  tierFilter: string; statusFilter: string; billingCycleFilter: string;
  onTierFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onBillingCycleFilterChange: (value: string) => void;
}) {
  const t = useBillingDashboardTranslations();
  return (
    <div className="flex flex-wrap gap-4">
      <div className="w-40">
        <Select value={tierFilter} onValueChange={onTierFilterChange}>
          <SelectTrigger><SelectValue placeholder={t("filterTier")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllTiers")}</SelectItem>
            {getInternalTierFilterOptions().map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-48">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger><SelectValue placeholder={t("filterStatus")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatuses")}</SelectItem>
            <SelectItem value="ACTIVE">{t("statusActive")}</SelectItem>
            <SelectItem value="TRIAL">{t("statusTrial")}</SelectItem>
            <SelectItem value="PAST_DUE">{t("statusPastDue")}</SelectItem>
            <SelectItem value="GRACE_PERIOD">{t("statusGracePeriod")}</SelectItem>
            <SelectItem value="CANCELLED">{t("statusCancelled")}</SelectItem>
            <SelectItem value="EXPIRED">{t("statusExpired")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-40">
        <Select value={billingCycleFilter} onValueChange={onBillingCycleFilterChange}>
          <SelectTrigger><SelectValue placeholder={t("filterBillingCycle")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllCycles")}</SelectItem>
            <SelectItem value="MONTHLY">{t("cycleMonthly")}</SelectItem>
            <SelectItem value="YEARLY">{t("cycleYearly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SubscriptionsTable({
  subscriptions,
  sending,
  onSendReminder,
  onExtendGracePeriod,
}: {
  subscriptions: InternalSubscriptionOverview[];
  sending: boolean;
  onSendReminder: (subscription: InternalSubscriptionOverview) => void;
  onExtendGracePeriod: (subscription: InternalSubscriptionOverview) => void;
}) {
  const t = useBillingDashboardTranslations();
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colClinic")}</TableHead>
              <TableHead>{t("colTier")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colBillingCycle")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
              <TableHead>{t("colPeriodEnd")}</TableHead>
              <TableHead>{t("colCredits")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("emptySubscriptions")}
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => (
                <SubscriptionRow
                  key={subscription.id}
                  subscription={subscription}
                  sending={sending}
                  onSendReminder={onSendReminder}
                  onExtendGracePeriod={onExtendGracePeriod}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SubscriptionRow({ subscription, sending, onSendReminder, onExtendGracePeriod }: {
  subscription: InternalSubscriptionOverview;
  sending: boolean;
  onSendReminder: (subscription: InternalSubscriptionOverview) => void;
  onExtendGracePeriod: (subscription: InternalSubscriptionOverview) => void;
}) {
  const t = useBillingDashboardTranslations();
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{subscription.clinic.name}</p>
          <p className="text-xs text-muted-foreground">{subscription.clinic.email}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={getInternalTierBadgeClass(subscription.tier)}>{subscription.tier}</Badge>
      </TableCell>
      <TableCell>
        <Badge className={getBillingStatusBadgeClass(subscription.status)}>{formatBillingStatus(subscription.status)}</Badge>
      </TableCell>
      <TableCell><span className="text-sm">{subscription.billingCycle}</span></TableCell>
      <TableCell>
        <span className="font-medium">
          {formatCurrency(subscription.amount, { currency: subscription.currency, fractionDigits: 0 })}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm">{formatDate(subscription.currentPeriodEnd, "MMM d, yyyy")}</span>
      </TableCell>
      <TableCell>
        {subscription.clinic.referralCreditsMonths > 0 && (
          <Badge variant="outline" className="text-success">
            {t("creditsMonths", { count: subscription.clinic.referralCreditsMonths })}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => onSendReminder(subscription)} disabled={sending}>
            <Mail className="h-4 w-4" />
          </Button>
          {subscription.status === "GRACE_PERIOD" && (
            <Button size="sm" variant="ghost" onClick={() => onExtendGracePeriod(subscription)}>
              <CalendarPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function PaymentsTable({
  payments,
}: {
  payments: InternalBillingPaymentItem[];
}) {
  const t = useBillingDashboardTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentPayments")}</CardTitle>
        <CardDescription>
          {t("recentPaymentsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colDate")}</TableHead>
              <TableHead>{t("colClinic")}</TableHead>
              <TableHead>{t("colPlanService")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colGatewayId")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("emptyPayments")}
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentRow({ payment }: { payment: InternalBillingPaymentItem }) {
  return (
    <TableRow>
      <TableCell>
        <span className="text-sm">
          {formatDate(payment.paidAt || payment.createdAt, "MMM d, yyyy HH:mm")}
        </span>
      </TableCell>
      <TableCell>
        <p className="font-medium">{payment.clinicName}</p>
      </TableCell>
      <TableCell>
        <Badge className={getInternalTierBadgeClass(payment.planLabel)}>
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
        <Badge className={getPaymentStatusBadgeClass(payment.status)}>
          {payment.status}
        </Badge>
      </TableCell>
      <TableCell>
        <code className="text-xs text-muted-foreground">
          {payment.gatewayPaymentId || "-"}
        </code>
      </TableCell>
    </TableRow>
  );
}

function RevenueTrendsCard({
  metrics,
}: {
  metrics: InternalBillingMetrics | null;
}) {
  const t = useBillingDashboardTranslations();
  const revenueByMonth = metrics?.revenueByMonth ?? [];
  const maxRevenue = Math.max(...revenueByMonth.map((data) => data.revenue), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("revenueByMonth")}</CardTitle>
        <CardDescription>{t("revenueByMonthDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {revenueByMonth.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t("emptyRevenue")}
            </p>
          ) : (
            revenueByMonth.map((data) => (
              <div key={data.month} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium">{data.month}</span>
                <div className="flex-1">
                  <div className="h-8 overflow-hidden rounded-md bg-muted">
                    <div
                      className="flex h-full items-center justify-end bg-primary pr-2"
                      style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                    >
                      <span className="text-xs font-medium text-primary-foreground">
                        {formatCurrency(data.revenue, {
                          currency: DEFAULT_CURRENCY,
                          fractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getPaymentStatusBadgeClass(status: string) {
  if (status === "SUCCESS") return "badge-success";
  if (status === "PENDING") return "badge-warning";
  return "badge-danger";
}

function getBillingStatusBadgeClass(status: string) {
  if (status === "ACTIVE") return "badge-success";
  if (status === "TRIAL") return "badge-info";
  if (status === "PAST_DUE") return "badge-warning";
  if (status === "GRACE_PERIOD") return "badge-warning";
  if (status === "CANCELLED") return "badge-muted";
  return "badge-danger";
}

function formatBillingStatus(status: string) {
  // The formatBillingStatus function is a runtime helper that maps
  // API status codes to human labels. With Phase 3, the labels live
  // in the messages file and are resolved by the consumer via
  // useTranslations. This helper is kept for the SubscriptionRow
  // badge label, which historically read the API enum directly.
  // (TODO: refactor to receive the t() instance and resolve
  // through the InternalBilling.dashboard namespace.)
  return status;
}
