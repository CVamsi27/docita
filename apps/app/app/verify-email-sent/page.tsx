"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import {
  useAuth,
  VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
} from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";

export default function VerifyEmailSentPage() {
  const { user, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<"pending" | "failed">(
    "pending",
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedStatus = window.sessionStorage.getItem(
      VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
    );
    if (storedStatus === "failed") {
      setDeliveryStatus("failed");
      return;
    }

    setDeliveryStatus("pending");
  }, []);

  const handleResend = async () => {
    setResending(true);
    try {
      await apiFetch("/auth/resend-verification", { method: "POST" });
      window.sessionStorage.setItem(
        VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
        "pending",
      );
      setDeliveryStatus("pending");
      setResent(true);
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
          <h1 className="text-2xl font-bold">Check your email</h1>
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
                <p>Check your inbox and spam folder for a message from Docita.</p>
                <p>The link stays active for 24 hours and you can request a fresh one anytime.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleResend}
            disabled={resending || resent}
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resent ? (
              "Verification email sent"
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {deliveryStatus === "failed"
                  ? "Send verification email again"
                  : "Resend verification email"}
              </>
            )}
          </Button>
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
