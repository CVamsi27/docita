"use client";

import type {
  InternalBillingMetrics,
  InternalSubscriptionOverview,
} from "@workspace/data-access/internal";
import { differenceInDays, formatDistanceToNow } from "@workspace/utils";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { AlertTriangle, CalendarPlus, Clock, Mail } from "lucide-react";

interface BillingRiskSummaryProps {
  metrics: InternalBillingMetrics | null;
  onSendReminder: (subscription: InternalSubscriptionOverview) => void;
  onExtendGracePeriod: (subscription: InternalSubscriptionOverview) => void;
}

export function BillingRiskSummary({
  metrics,
  onSendReminder,
  onExtendGracePeriod,
}: BillingRiskSummaryProps) {
  const expiringSubscriptions = metrics?.expiringSubscriptions ?? [];
  const gracePeriodSubscriptions = metrics?.gracePeriodSubscriptions ?? [];
  const hasRisk =
    expiringSubscriptions.length > 0 || gracePeriodSubscriptions.length > 0;

  return (
    <>
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

      {hasRisk && (
        <div className="grid gap-4 md:grid-cols-2">
          {expiringSubscriptions.length > 0 && (
            <ExpiringSubscriptionsCard
              subscriptions={expiringSubscriptions}
              onSendReminder={onSendReminder}
            />
          )}
          {gracePeriodSubscriptions.length > 0 && (
            <GracePeriodSubscriptionsCard
              subscriptions={gracePeriodSubscriptions}
              onExtendGracePeriod={onExtendGracePeriod}
            />
          )}
        </div>
      )}
    </>
  );
}

function ExpiringSubscriptionsCard({
  subscriptions,
  onSendReminder,
}: {
  subscriptions: InternalSubscriptionOverview[];
  onSendReminder: (subscription: InternalSubscriptionOverview) => void;
}) {
  return (
    <Card className="border-warning/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">Expiring soon</CardTitle>
        </div>
        <CardDescription>
          {subscriptions.length} subscription(s) expiring in the next 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {subscriptions.slice(0, 3).map((subscription) => (
            <SubscriptionRow
              key={subscription.id}
              subscription={subscription}
              secondaryLine="Expires"
              secondaryValue={formatDistanceToNow(subscription.currentPeriodEnd)}
              actionLabel="Remind"
              actionIcon={Mail}
              onAction={() => onSendReminder(subscription)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GracePeriodSubscriptionsCard({
  subscriptions,
  onExtendGracePeriod,
}: {
  subscriptions: InternalSubscriptionOverview[];
  onExtendGracePeriod: (subscription: InternalSubscriptionOverview) => void;
}) {
  return (
    <Card className="border-warning/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">In Grace Period</CardTitle>
        </div>
        <CardDescription>
          {subscriptions.length} subscription(s) in grace period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {subscriptions.slice(0, 3).map((subscription) => (
            <SubscriptionRow
              key={subscription.id}
              subscription={subscription}
              secondaryValue={`${differenceInDays(
                subscription.currentPeriodEnd,
                new Date(),
              )} days remaining`}
              actionLabel="Extend"
              actionIcon={CalendarPlus}
              onAction={() => onExtendGracePeriod(subscription)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SubscriptionRowProps {
  subscription: InternalSubscriptionOverview;
  /** Optional prefix label rendered before the value (e.g. "Expires"). */
  secondaryLine?: string;
  secondaryValue: string;
  actionLabel: string;
  actionIcon: typeof Mail;
  onAction: () => void;
}

function SubscriptionRow({
  subscription,
  secondaryLine,
  secondaryValue,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
}: SubscriptionRowProps) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border/70 p-3">
      <div>
        <p className="font-medium">{subscription.clinic.name}</p>
        <p className="text-sm text-muted-foreground">
          {secondaryLine ? (
            <>
              {secondaryLine}
              <span className="ml-1">{secondaryValue}</span>
            </>
          ) : (
            <span>{secondaryValue}</span>
          )}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onAction}>
        <ActionIcon className="mr-2 h-3 w-3" />
        {actionLabel}
      </Button>
    </div>
  );
}
