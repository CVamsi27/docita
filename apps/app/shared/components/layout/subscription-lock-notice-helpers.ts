import {
  mapDbClinicTierStringToTierName,
  TRIAL_GRACE_DAYS,
} from "@workspace/types";
import type { Clinic } from "@/lib/contexts/clinic-context";
import {
  getTrialState,
  isPastSubscriptionGraceDeadline,
  isRenewalUnpaidWithOutstandingPending,
} from "@/lib/subscription/subscription-lockout";
import { getTierInfo } from "@/lib/subscription/tier-access";
import { formatDate } from "@/lib/formatters";

export type NoticeKind =
  | "expired"
  | "paused"
  | "grace-or-past-due"
  | "trial-grace"
  | "trial-active"
  | "payment-required";

export interface SubscriptionLockNoticeCopy {
  kind: NoticeKind;
  title: string;
  description: string;
  ctaLabel: string;
  variant: "destructive" | "default";
  toneClass?: string;
}

type ClinicShape = Pick<
  Clinic,
  "subscriptionStatus" | "tier" | "trialEndsAt" | "subscriptionGraceUntil"
>;

/**
 * Resolves the visible {kind, title, description, cta, variant} for the
 * subscription-lock notice based on clinic state. Returns null when no notice
 * should render. Pure — no React, no router. Unit-testable.
 */
export function resolveSubscriptionLockNotice(
  clinic: ClinicShape | null | undefined,
  billing?: {
    hasOutstandingPendingPayment?: boolean;
    currentPeriodEnd?: string | null;
  } | null,
): SubscriptionLockNoticeCopy | null {
  const status = clinic?.subscriptionStatus;
  const renewalUnpaidPending = isRenewalUnpaidWithOutstandingPending({
    hasOutstandingPendingPayment:
      billing?.hasOutstandingPendingPayment === true,
    currentPeriodEnd: billing?.currentPeriodEnd ?? null,
  });

  if (renewalUnpaidPending) {
    return {
      kind: "payment-required",
      title: "Renewal payment pending",
      description:
        "Your billing period has ended and the subscription charge is still unpaid. Complete payment under Settings, Subscription to keep staff access active.",
      ctaLabel: "Pay now",
      variant: "destructive",
    };
  }

  if (!status || status === "ACTIVE") return null;

  const trialState = clinic ? getTrialState(clinic) : null;
  const isExpired = status === "EXPIRED";
  const isGrace = status === "GRACE";
  const isPastDue = status === "PAST_DUE";
  const isPaused = status === "PAUSED";
  const isTrialing = status === "TRIALING";
  const isTrialGrace = trialState === "GRACE";

  const trialTierLabel =
    clinic?.tier && typeof clinic.tier === "string"
      ? getTierInfo(mapDbClinicTierStringToTierName(clinic.tier)).name
      : "subscription";
  const trialEnd = clinic?.trialEndsAt ? new Date(clinic.trialEndsAt) : null;
  const trialEndText =
    trialEnd && Number.isFinite(trialEnd.getTime())
      ? formatDate(trialEnd)
      : null;
  const trialDaysLeft =
    isTrialing && trialEnd && Number.isFinite(trialEnd.getTime())
      ? Math.max(
          0,
          Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : null;
  const trialGraceDaysLeft =
    isTrialGrace && trialEnd && Number.isFinite(trialEnd.getTime())
      ? Math.max(
          0,
          Math.ceil(
            (trialEnd.getTime() +
              TRIAL_GRACE_DAYS * 24 * 60 * 60 * 1000 -
              Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;
  const graceUntilRaw = clinic?.subscriptionGraceUntil;
  const graceUntil =
    graceUntilRaw !== undefined && graceUntilRaw !== null
      ? new Date(graceUntilRaw)
      : null;
  const graceUntilText =
    graceUntil && Number.isFinite(graceUntil.getTime())
      ? formatDate(graceUntil)
      : null;
  const pastGraceDeadline = clinic
    ? isPastSubscriptionGraceDeadline(clinic)
    : false;

  if (isExpired) {
    return {
      kind: "expired",
      title: "Subscription Expired: Workspace Locked",
      description:
        "This facility is locked until payment is completed. You can still open billing under Settings, Subscription to restore access.",
      ctaLabel: "Resolve Payment",
      variant: "destructive",
    };
  }

  if (isTrialGrace) {
    return {
      kind: "trial-grace",
      title: "Trial ended — payment required",
      description: `Your free trial has ended${
        trialGraceDaysLeft !== null
          ? `. You have ${trialGraceDaysLeft} day${
              trialGraceDaysLeft === 1 ? "" : "s"
            } to complete payment`
          : ""
      } before access is blocked. Open Settings → Subscription to pay now.`,
      ctaLabel: "Pay now",
      variant: "destructive",
    };
  }

  if (isPaused) {
    return {
      kind: "paused",
      title: "Subscription Paused",
      description:
        "This subscription is paused. Resolve billing to restore full access.",
      ctaLabel: "Resolve Payment",
      variant: "default",
      toneClass: "border-warning/40 bg-warning/10",
    };
  }

  if (isGrace || isPastDue) {
    const opener = isPastDue
      ? "Your payment is overdue."
      : "Payment is still unresolved.";
    const tail =
      graceUntilText && !pastGraceDeadline
        ? ` Resolve by ${graceUntilText} or staff access may pause until a billing admin completes payment under Settings, Subscription.`
        : " Resolve payment now to keep Docita access active.";
    return {
      kind: "grace-or-past-due",
      title: "Payment Grace Period: Access Restricted",
      description: `${opener}${tail}`,
      ctaLabel: "Resolve Payment",
      variant: "default",
      toneClass: "border-warning/40 bg-warning/10",
    };
  }

  if (isTrialing) {
    const isEnding = trialDaysLeft !== null && trialDaysLeft <= 3;
    const trialBody =
      trialDaysLeft !== null
        ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your trial`
        : "trial active";
    return {
      kind: "trial-active",
      title: isEnding
        ? "Trial ending soon"
        : "Trial active: payment not completed",
      description: `${trialTierLabel} plan · ${trialBody}${
        trialEndText ? ` (ends ${trialEndText})` : ""
      }. Add payment before it ends to stay active.`,
      ctaLabel: "Billing & subscription",
      variant: "default",
      toneClass: "border-info/40 bg-info/10",
    };
  }

  return {
    kind: "payment-required",
    title: "Payment required",
    description:
      "Your subscription needs billing attention. Resolve payment to keep Docita access active.",
    ctaLabel: "Resolve Payment",
    variant: "default",
    toneClass: "border-warning/40 bg-warning/10",
  };
}
