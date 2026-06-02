"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { toast } from "sonner";
import {
  useAuth,
  VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
  type User,
} from "@/lib/auth/auth-context";
import { apiFetch } from "@/lib/api/api-client";
import { logger } from "@/lib/monitoring/logger";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth";
import { BackButton } from "@/components/navigation/back-button";

const VERIFICATION_EMAIL_COOLDOWN_MS = 120 * 1000;
const VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY =
  "docita_verification_email_resend_available_at";

function getNextPathForVerifiedUser(user: User | null): string {
  if (!user) {
    return "/login?next=/verify-email-sent";
  }

  if (user.clinicId || user.onboardingStep === "COMPLETED") {
    return "/today";
  }

  switch (user.onboardingStep) {
    case "JOINING_CLINIC":
      return "/join-request-status";
    case "CREATING_CLINIC":
      return "/onboarding";
    default:
      return "/choose-path";
  }
}

function formatCooldown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function VerifyEmailSentPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<"pending" | "failed">(
    "pending",
  );
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) {
      setRedirectMessage("Redirecting to login…");
      router.replace("/login?next=/verify-email-sent");
      return;
    }

    if (user.emailVerified === true) {
      setRedirectMessage(null);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const storedStatus = window.sessionStorage.getItem(
      VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
    );
    const storedResendAvailableAt = window.sessionStorage.getItem(
      VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY,
    );
    const resendAvailableAtValue = storedResendAvailableAt
      ? Number(storedResendAvailableAt)
      : null;

    if (
      typeof resendAvailableAtValue === "number" &&
      Number.isFinite(resendAvailableAtValue) &&
      resendAvailableAtValue > Date.now()
    ) {
      setResendAvailableAt(resendAvailableAtValue);
    } else {
      window.sessionStorage.removeItem(VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY);
      setResendAvailableAt(null);
    }

    if (storedStatus === "failed") {
      setDeliveryStatus("failed");
      return;
    }

    setDeliveryStatus("pending");
  }, [router, user]);

  useEffect(() => {
    if (!resendAvailableAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const timeoutId = window.setTimeout(
      () => {
        setResendAvailableAt(null);
        window.sessionStorage.removeItem(
          VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY,
        );
        setNow(Date.now());
      },
      Math.max(resendAvailableAt - Date.now(), 0),
    );

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [resendAvailableAt]);

  const isResendCoolingDown =
    resendAvailableAt !== null && resendAvailableAt > now;
  const resendCooldownRemainingMs = isResendCoolingDown
    ? resendAvailableAt - now
    : 0;

  if (redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description={redirectMessage}
      />
    );
  }

  if (user?.emailVerified === true) {
    return (
      <PreDashboardShell currentStep="verify-email-sent" showSignOut>
        <div className="ui-card-surface space-y-6 rounded-[var(--radius-xl)] p-8">
          <div className="relative mx-auto w-fit">
            <div
              aria-hidden
              className="absolute inset-0 scale-110 rounded-full bg-success/20 blur-md"
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-success/25 bg-success/[0.1] text-success shadow-sm">
              <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
            </div>
          </div>

          <div className="text-center ui-copy-stack">
            <h1 className="ui-page-title">Email verified</h1>
            <p className="ui-page-subtitle">
              You can continue setup when you are ready.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-11"
              onClick={() => router.push(getNextPathForVerifiedUser(user))}
            >
              Continue
            </Button>
            <BackButton
              fallback="/login"
              label="Back to login"
              variant="ghost"
              size="default"
              className="w-full h-11"
            />
          </div>
        </div>
      </PreDashboardShell>
    );
  }

  const handleResend = async () => {
    setResending(true);
    try {
      await apiFetch("/auth/resend-verification", { method: "POST" });
      const availableAt = Date.now() + VERIFICATION_EMAIL_COOLDOWN_MS;
      window.sessionStorage.setItem(
        VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY,
        String(availableAt),
      );
      window.sessionStorage.setItem(
        VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
        "pending",
      );
      setResendAvailableAt(availableAt);
      setDeliveryStatus("pending");
      setNow(Date.now());
      toast.success("Verification email resent. Check your inbox.");
    } catch (error) {
      logger.error("Failed to resend verification email", { error });
      window.sessionStorage.setItem(
        VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
        "failed",
      );
      setDeliveryStatus("failed");
      showUserFacingErrorToast(
        "We could not resend the verification email right now. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  const email = user?.email ?? "your email";

  return (
    <PreDashboardShell currentStep="verify-email-sent" showSignOut>
      <div className="ui-card-surface space-y-6 rounded-[var(--radius-xl)] p-8">
        <div className="relative mx-auto w-fit">
          <div
            aria-hidden
            className="absolute inset-0 scale-110 rounded-full bg-primary/20 blur-md"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.1] text-primary shadow-sm">
            <Mail className="h-8 w-8" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="ui-page-title">Check your email</h1>
          <p className="ui-page-subtitle">We sent a verification link to</p>
          <p className="inline-flex rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm font-medium text-foreground">
            {email}
          </p>
          <p className="ui-page-subtitle pt-1">
            Use the verification link in the email before continuing with your
            clinic setup.
          </p>
        </div>

        {deliveryStatus === "failed" ? (
          <div className="surface-danger rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  We created your account, but the verification email could not
                  be confirmed a{"s "}sent.
                </p>
                <p className="ui-helper-text">
                  Try sending it again now. If it still does not arrive, contact
                  support so we can help you complete setup.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="surface-muted rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="space-y-1 ui-helper-text">
                <p>
                  Check your inbox and spam folder for a message from Docita.
                </p>
                <p>
                  The link stays active for 24 hours and you can request a fresh
                  one anytime.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleResend}
            disabled={resending || isResendCoolingDown}
          >
            {resending ? (
              <>
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
                Sending…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {isResendCoolingDown
                  ? "Verification email sent"
                  : deliveryStatus === "failed"
                    ? "Send verification email again"
                    : "Resend verification email"}
              </>
            )}
          </Button>
          {isResendCoolingDown && (
            <p className="text-center ui-helper-text">
              You can resend again in{" "}
              {formatCooldown(resendCooldownRemainingMs)}.
            </p>
          )}
        </div>

        <p className="text-center ui-helper-text">
          Wrong email?
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => void logout()}
            className="ml-1 h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out and try again
          </Button>
        </p>
      </div>
    </PreDashboardShell>
  );
}
