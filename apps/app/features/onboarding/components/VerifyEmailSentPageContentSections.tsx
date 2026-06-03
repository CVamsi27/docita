"use client";

import { AlertTriangle, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { BackButton } from "@/components/navigation/back-button";

function formatCooldown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function EmailVerifiedContent({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <>
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
        <Button className="w-full h-11" onClick={onContinue}>
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
    </>
  );
}

export function CheckEmailHero({ email }: { email: string }) {
  return (
    <div className="relative mx-auto w-fit">
      <div
        aria-hidden
        className="absolute inset-0 scale-110 rounded-full bg-primary/20 blur-md"
      />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.1] text-primary shadow-sm">
        <Mail className="h-8 w-8" strokeWidth={1.5} />
      </div>
    </div>
  );
}

export function CheckEmailMessage({ email }: { email: string }) {
  return (
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
  );
}

export function DeliveryStatusBanner({
  deliveryStatus,
}: {
  deliveryStatus: "pending" | "failed";
}) {
  if (deliveryStatus === "failed") {
    return (
      <div className="surface-danger rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              We created your account, but the verification email could not be
              confirmed a{"s "}sent.
            </p>
            <p className="ui-helper-text">
              Try sending it again now. If it still does not arrive, contact
              support so we can help you complete setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-muted rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <div className="space-y-1 ui-helper-text">
          <p>Check your inbox and spam folder for a message from Docita.</p>
          <p>
            The link stays active for 24 hours and you can request a fresh one
            anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ResendButtonSection({
  resending,
  isResendCoolingDown,
  resendCooldownRemainingMs,
  deliveryStatus,
  onResend,
}: {
  resending: boolean;
  isResendCoolingDown: boolean;
  resendCooldownRemainingMs: number;
  deliveryStatus: "pending" | "failed";
  onResend: () => void;
}) {
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full h-11"
        onClick={onResend}
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
          You can resend again in {formatCooldown(resendCooldownRemainingMs)}.
        </p>
      )}
    </div>
  );
}

export function WrongEmailFooter({ onSignOut }: { onSignOut: () => void }) {
  return (
    <p className="text-center ui-helper-text">
      Wrong email?
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onSignOut}
        className="ml-1 h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
      >
        Sign out and try again
      </Button>
    </p>
  );
}
