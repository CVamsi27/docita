"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Mail, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import {
  useAuth,
  VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
  type User,
} from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/common/navigation/back-button";

const VERIFICATION_EMAIL_COOLDOWN_MS = 120 * 1000;
const VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY =
  "docita_verification_email_resend_available_at";

function getNextPathForVerifiedUser(user: User | null): string {
  if (!user) {
    return "/login?next=/verify-email-sent";
  }

  if (user.clinicId || user.onboardingStep === "COMPLETED") {
    return "/dashboard";
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
      setRedirectMessage("Redirecting to login...");
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
      window.sessionStorage.removeItem(
        VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY,
      );
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

    const timeoutId = window.setTimeout(() => {
      setResendAvailableAt(null);
      window.sessionStorage.removeItem(
        VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY,
      );
      setNow(Date.now());
    }, Math.max(resendAvailableAt - Date.now(), 0));

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
        title="Redirecting..."
        description={redirectMessage}
      />
    );
  }

  if (user?.emailVerified === true) {
    return (
      <PreDashboardShell currentStep="verify-email-sent" showSignOut>
        <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-normal">Email verified</h1>
            <p className="text-muted-foreground text-sm">
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
      const availableAt =
        Date.now() + VERIFICATION_EMAIL_COOLDOWN_MS;
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
      <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-normal">Check your email</h1>
          <p className="text-muted-foreground text-sm">We need to verify</p>
          <p className="font-medium text-sm">{email}</p>
          <p className="text-muted-foreground text-sm pt-1">
            Use the verification link in the email before continuing with your
            clinic setup.
          </p>
        </div>

        {deliveryStatus === "failed" ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  We created your account, but the verification email could not
                  be confirmed as sent.
                </p>
                <p className="text-muted-foreground">
                  Try sending it again now. If it still does not arrive, contact
                  support so we can help you complete setup.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="space-y-1 text-muted-foreground">
                <p>Check your inbox and spam folder for a message from Docita</p>
                <p>The link stays active for 24 hours and you can request a fresh one anytime</p>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
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
            <p className="text-center text-xs text-muted-foreground">
              You can resend again in {formatCooldown(resendCooldownRemainingMs)}.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Wrong email?{" "}
          <button
            type="button"
            onClick={logout}
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Sign out and try again
          </button>
        </p>
      </div>
    </PreDashboardShell>
  );
}
