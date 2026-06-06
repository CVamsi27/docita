"use client";

import type {
  InternalBillingMetrics,
  InternalSubscriptionOverview,
} from "@workspace/data-access/internal";
import type { InternalBillingPaymentItem } from "@workspace/types";
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
import {
  formatBillingStatus,
  getBillingStatusBadgeClass,
} from "./billing-status";

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
  return (
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
  tierFilter,
  statusFilter,
  billingCycleFilter,
  onTierFilterChange,
  onStatusFilterChange,
  onBillingCycleFilterChange,
}: {
  tierFilter: string;
  statusFilter: string;
  billingCycleFilter: string;
  onTierFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onBillingCycleFilterChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="w-40">
        <Select value={tierFilter} onValueChange={onTierFilterChange}>
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
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
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
          onValueChange={onBillingCycleFilterChange}
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
  return (
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
                  className="py-8 text-center text-muted-foreground"
                >
                  No subscriptions found
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

function SubscriptionRow({
  subscription,
  sending,
  onSendReminder,
  onExtendGracePeriod,
}: {
  subscription: InternalSubscriptionOverview;
  sending: boolean;
  onSendReminder: (subscription: InternalSubscriptionOverview) => void;
  onExtendGracePeriod: (subscription: InternalSubscriptionOverview) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{subscription.clinic.name}</p>
          <p className="text-xs text-muted-foreground">
            {subscription.clinic.email}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={getInternalTierBadgeClass(subscription.tier)}>
          {subscription.tier}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={getBillingStatusBadgeClass(subscription.status)}>
          {formatBillingStatus(subscription.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm">{subscription.billingCycle}</span>
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
          {formatDate(subscription.currentPeriodEnd, "MMM d, yyyy")}
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
            onClick={() => onSendReminder(subscription)}
            disabled={sending}
          >
            <Mail className="h-4 w-4" />
          </Button>
          {subscription.status === "GRACE_PERIOD" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onExtendGracePeriod(subscription)}
            >
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
  return (
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
                  className="py-8 text-center text-muted-foreground"
                >
                  No payments found
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
  const revenueByMonth = metrics?.revenueByMonth ?? [];
  const maxRevenue = Math.max(...revenueByMonth.map((data) => data.revenue), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Month</CardTitle>
        <CardDescription>Monthly revenue trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {revenueByMonth.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No revenue data available
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
