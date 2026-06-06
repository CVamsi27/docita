import { isRenewalUnpaidWithOutstandingPending } from "@/lib/subscription/subscription-lockout";
import { buildSubscriptionNoticeContext } from "./subscription-lock-notice-context";
import {
  expiredNotice,
  graceOrPastDueNotice,
  pausedNotice,
  paymentRequiredNotice,
  renewalPaymentNotice,
  trialActiveNotice,
  trialGraceNotice,
} from "./subscription-lock-notice-copy";
export type {
  ClinicShape,
  NoticeKind,
  SubscriptionLockNoticeCopy,
} from "./subscription-lock-notice-types";
import type {
  ClinicShape,
  SubscriptionLockNoticeCopy,
} from "./subscription-lock-notice-types";

export const TRIAL_NOTICE_REMINDER_DAYS = 5 as const;
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

  if (renewalUnpaidPending) return renewalPaymentNotice();

  if (!status || status === "ACTIVE") return null;

  const context = buildSubscriptionNoticeContext(clinic);
  if (status === "EXPIRED") return expiredNotice();
  if (context.isTrialGrace) return trialGraceNotice(context);
  if (status === "PAUSED") return pausedNotice();
  if (status === "GRACE" || status === "PAST_DUE") return graceOrPastDueNotice(status === "PAST_DUE", context);
  if (status === "TRIALING") return trialActiveNotice(context);
  return paymentRequiredNotice();
}
