"use client";

import Link from "next/link";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { AlertTriangle, Clock, Info, XCircle } from "lucide-react";
import { scrollToBillingPlans } from "./subscription-settings-helpers";

export function SubscriptionLoadingState() {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div
          className="flex flex-col items-center gap-4 sm:flex-row sm:items-start"
          role="status"
          aria-live="polite"
          aria-label="Loading subscription"
        >
          <DocitaLoadingIndicator
            variant="section"
            withStatusRole={false}
            iconClassName="h-8 w-8 text-muted-foreground"
          />
          <div className="min-w-0 flex-1 space-y-2 text-left">
            <Skeleton className="h-4 w-full max-w-[250px]" />
            <Skeleton className="h-4 w-full max-w-[200px]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface NonAdminSubscriptionViewProps {
  tierName: string;
  subscriptionStatusLabel: string;
}

export function NonAdminSubscriptionView({
  tierName,
  subscriptionStatusLabel,
}: NonAdminSubscriptionViewProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Your current plan details.</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="ui-section-title text-[var(--fs-lg)]">{tierName}</p>
          <Badge
            variant="secondary"
            className="ui-eyebrow border border-border/60 bg-muted/40 capitalize text-muted-foreground"
          >
            {subscriptionStatusLabel}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Contact your facility administrator to manage subscription.
        </p>
      </CardContent>
    </Card>
  );
}

interface TrialAlertProps {
  trialDaysLeft: number;
  tierName: string;
}

export function TrialAlert({ trialDaysLeft, tierName }: TrialAlertProps) {
  return (
    <Alert className="border-info/40 bg-info/10">
      <Clock className="h-4 w-4 text-info" />
      <AlertTitle>Free Trial Active</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {trialDaysLeft > 0
            ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your ${tierName} trial.`
            : `Your ${tierName} trial ends today`}{" "}
          Add payment before the trial ends so your subscription can renew
          without interruption.
        </span>
        <Button
          size="sm"
          onClick={scrollToBillingPlans}
          className="shrink-0"
        >
          Add payment
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function FreeStarterAlert() {
  return (
    <Alert className="border-border bg-muted/40">
      <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
      <AlertTitle>Starter without a paid subscription</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>Your clinic is active on Starter at no charge.</span>
        <Button
          size="sm"
          onClick={scrollToBillingPlans}
          className="shrink-0"
        >
          View paid plans
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function GstinReminderAlert() {
  return (
    <Alert className="border-border bg-muted/40">
      <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
      <AlertTitle>Add your GSTIN for GST invoices</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Add your facility GSTIN so your payments receive GST invoices. It
          is optional, but required on the invoice for input tax credit.
        </span>
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href="/settings?tab=general">Add GSTIN</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface PaymentDueAlertProps {
  isResolving: boolean;
  resolvePayment: () => Promise<void>;
}

export function PaymentDueAlert({
  isResolving,
  resolvePayment,
}: PaymentDueAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Payment due</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Your payment is overdue. Update your payment method to avoid
          service interruption.
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isResolving}
          onClick={() => void resolvePayment()}
          className="shrink-0 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
        >
          {isResolving ? "Opening\u2026" : "Update Payment"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface GracePeriodAlertProps {
  isResolving: boolean;
  resolvePayment: () => Promise<void>;
}

export function GracePeriodAlert({
  isResolving,
  resolvePayment,
}: GracePeriodAlertProps) {
  return (
    <Alert className="border-warning/40 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle>Payment grace period</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Payment is still unresolved. Some access may be restricted until
          payment is completed.
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isResolving}
          onClick={() => void resolvePayment()}
          className="shrink-0"
        >
          {isResolving ? "Opening\u2026" : "Resolve Payment"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ExpiredSubscriptionAlert() {
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertTitle>Subscription expired</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Your facility workspace is locked. Choose a plan and complete
          payment to restore access.
        </span>
        <Button
          size="sm"
          onClick={scrollToBillingPlans}
          className="shrink-0 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
        >
          Choose a plan
        </Button>
      </AlertDescription>
    </Alert>
  );
}
