"use client";

// jscpd:ignore-start
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton
} from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Alert,
// jscpd:ignore-end
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { AlertTriangle, Clock, Info, XCircle } from "lucide-react";
import { scrollToBillingPlans } from "./subscription-settings-helpers";
import { WhatsAppButton } from "@/components/whatsapp/whatsapp-button";
import { getSupportPhoneNumber } from "@/lib/constants/support-contact";

/**
 * Phase 3 (per-feature): the subscription settings alerts and
 * helpers used on the Settings > Billing page. 12 literals
 * converted to useTranslations.
 */
function useSubscriptionSettingsTranslations() {
  return useTranslations("Settings.subscription");
}

export function SubscriptionLoadingState() {
  const t = useSubscriptionSettingsTranslations();
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div
          className="flex flex-col items-center gap-4 sm:flex-row sm:items-start"
          role="status"
          aria-live="polite"
          aria-label={t("loadingAriaLabel")}
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
  const t = useSubscriptionSettingsTranslations();
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
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
          {t("nonAdminHint")}
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
  const t = useSubscriptionSettingsTranslations();
  return (
    <Alert className="border-info/40 bg-info/10">
      <Clock className="h-4 w-4 text-info" />
      <AlertTitle>{t("trialTitle")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {trialDaysLeft > 0
            ? t("trialDaysLeft", { count: trialDaysLeft, tier: tierName })
            : t("trialEndsToday", { tier: tierName })}{" "}
          {t("trialHint")}
        </span>
        <Button
          size="sm"
          onClick={scrollToBillingPlans}
          className="shrink-0"
        >
          {t("addPaymentButton")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function FreeStarterAlert() {
  const t = useSubscriptionSettingsTranslations();
  return (
    <Alert className="border-border bg-muted/40">
      <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
      <AlertTitle>{t("freeStarterTitle")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{t("freeStarterHint")}</span>
        <Button
          size="sm"
          onClick={scrollToBillingPlans}
          className="shrink-0"
        >
          {t("viewPaidPlansButton")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function GstinReminderAlert() {
  const t = useSubscriptionSettingsTranslations();
  return (
    <Alert className="border-border bg-muted/40">
      <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
      <AlertTitle>{t("gstinTitle")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{t("gstinHint")}</span>
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href="/settings?tab=general">{t("addGstinButton")}</Link>
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
  const t = useSubscriptionSettingsTranslations();
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{t("paymentDueTitle")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{t("paymentDueHint")}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={isResolving}
          onClick={() => void resolvePayment()}
          className="shrink-0 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
        >
          {isResolving ? t("opening") : t("updatePaymentButton")}
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
  const t = useSubscriptionSettingsTranslations();
  return (
    <Alert className="border-warning/40 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle>{t("gracePeriodTitle")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{t("gracePeriodHint")}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={isResolving}
          onClick={() => void resolvePayment()}
          className="shrink-0"
        >
          {isResolving ? t("opening") : t("resolvePaymentButton")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ExpiredSubscriptionAlert() {
  const t = useSubscriptionSettingsTranslations();
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertTitle>{t("expiredTitle")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{t("expiredHint")}</span>
        <Button
          size="sm"
          onClick={scrollToBillingPlans}
          className="shrink-0 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
        >
          {t("choosePlanButton")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function BillingSupportBlock() {
  const t = useSubscriptionSettingsTranslations();
  const supportPhone = getSupportPhoneNumber();

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--fs-sm)] text-muted-foreground">
          {t("supportHint")}
        </p>
        <WhatsAppButton
          phoneNumber={supportPhone}
          message={t("supportWhatsappMessage")}
          label={t("supportButtonLabel")}
          variant="outline"
          size="sm"
          className="shrink-0"
        />
      </div>
    </div>
  );
}
