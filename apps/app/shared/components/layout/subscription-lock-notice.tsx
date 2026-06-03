"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LockKeyhole, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Button } from "@workspace/ui/components/form/button";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useSubscription } from "@workspace/data-access";
import {
  SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_SETTINGS_PATH,
} from "@/lib/subscription/subscription-settings-path";
import {
  resolveSubscriptionLockNotice,
  TRIAL_NOTICE_REMINDER_DAYS,
} from "./subscription-lock-notice-helpers";

const DISMISS_STORAGE_PREFIX = "subscription-notice-dismissed";

export function SubscriptionLockNotice() {
  const { clinic } = useClinic();
  const { data: subscription } = useSubscription({
    enabled: Boolean(clinic?.id),
  });
  const router = useRouter();
  const copy = resolveSubscriptionLockNotice(clinic, {
    hasOutstandingPendingPayment:
      subscription?.hasOutstandingPendingPayment === true,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
  });

  // Only the non-blocking trial-active notice may be dismissed. Payment-blocking
  // states (expired, grace, paused, payment-required) must stay visible.
  const dismissible = copy?.kind === "trial-active";
  // Two dismiss phases per trial: "early" (plenty of runway) and "ending" (final
  // TRIAL_NOTICE_REMINDER_DAYS). Keying the dismissal on the phase means an early
  // dismissal is forgotten once the trial enters its last stretch, so the notice
  // resurfaces as a final reminder — and can be dismissed again independently.
  const trialDaysLeft =
    copy?.kind === "trial-active" ? (copy.trialDaysLeft ?? null) : null;
  const dismissPhase =
    trialDaysLeft !== null && trialDaysLeft <= TRIAL_NOTICE_REMINDER_DAYS
      ? "ending"
      : "early";
  const dismissKey =
    dismissible && clinic?.id
      ? `${DISMISS_STORAGE_PREFIX}:${clinic.id}:${clinic.trialEndsAt ?? ""}:${dismissPhase}`
      : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissKey) {
      setDismissed(false);
      return;
    }
    setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  if (!copy) return null;
  if (dismissible && dismissed) return null;

  const handleDismiss = () => {
    if (dismissKey) {
      localStorage.setItem(dismissKey, "1");
    }
    setDismissed(true);
  };

  const settingsHref =
    copy.kind === "payment-required" ||
    copy.kind === "expired" ||
    copy.kind === "grace-or-past-due" ||
    copy.kind === "paused"
      ? SUBSCRIPTION_BILLING_RESOLVE_PATH
      : SUBSCRIPTION_SETTINGS_PATH;

  const useLockIcon = copy.kind === "expired" || copy.kind === "trial-grace";

  return (
    <div className="border-b bg-background px-4 py-3 md:px-6">
      <Alert variant={copy.variant} className={copy.toneClass}>
        {useLockIcon ? (
          <LockKeyhole className="h-4 w-4" />
        ) : (
          <AlertTriangle
            className={
              copy.kind === "trial-active"
                ? "h-4 w-4 text-info"
                : "h-4 w-4 text-warning"
            }
          />
        )}
        <AlertTitle className={dismissible ? "pr-8" : undefined}>
          {copy.title}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{copy.description}</span>
          <Button
            size="sm"
            variant={useLockIcon ? "secondary" : "outline"}
            onClick={() => router.push(settingsHref)}
            className="self-start sm:self-auto"
          >
            {copy.ctaLabel}
          </Button>
        </AlertDescription>
        {dismissible ? (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notice"
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </Alert>
    </div>
  );
}
