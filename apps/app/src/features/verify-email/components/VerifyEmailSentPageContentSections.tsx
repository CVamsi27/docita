import { AlertTriangle, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { BackButton } from "@/components/navigation/back-button";

/**
 * Ported from Next apps/app: features/onboarding/components/VerifyEmailSentPageContentSections.tsx.
 * Adapted next-intl useTranslations("Onboarding.verifyEmailSent") to react-i18next
 * useTranslation("Onboarding") with the same nested keys.
 */
function useVerifyEmailSentTranslations() {
  return useTranslation("Onboarding");
}

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
  const { t } = useVerifyEmailSentTranslations();
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
        <h1 className="ui-page-title">{t("verifyEmailSent.verifiedTitle")}</h1>
        <p className="ui-page-subtitle">
          {t("verifyEmailSent.verifiedSubtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <Button className="w-full h-11" onClick={onContinue}>
          {t("verifyEmailSent.continueButton")}
        </Button>
        <BackButton
          fallback="/login"
          label={t("verifyEmailSent.backToLoginButton")}
          variant="ghost"
          size="default"
          className="w-full h-11"
        />
      </div>
    </>
  );
}

export function CheckEmailHero() {
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
  const { t } = useVerifyEmailSentTranslations();
  return (
    <div className="space-y-2 text-center">
      <h1 className="ui-page-title">{t("verifyEmailSent.checkEmailTitle")}</h1>
      <p className="ui-page-subtitle">{t("verifyEmailSent.checkEmailSubtitle")}</p>
      <p className="inline-flex rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm font-medium text-foreground">
        {email}
      </p>
      <p className="ui-page-subtitle pt-1">
        {t("verifyEmailSent.checkEmailHint")}
      </p>
    </div>
  );
}

export function DeliveryStatusBanner({
  deliveryStatus,
}: {
  deliveryStatus: "pending" | "failed";
}) {
  const { t } = useVerifyEmailSentTranslations();
  if (deliveryStatus === "failed") {
    return (
      <div className="surface-danger rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {t("verifyEmailSent.deliveryFailedTitle")}
            </p>
            <p className="ui-helper-text">
              {t("verifyEmailSent.deliveryFailedBody")}
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
          <p>{t("verifyEmailSent.deliveryPendingBody")}</p>
          <p>{t("verifyEmailSent.deliveryPendingHint")}</p>
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
  const { t } = useVerifyEmailSentTranslations();
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
            {t("verifyEmailSent.sendingButton")}
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isResendCoolingDown
              ? t("verifyEmailSent.resendCooldownButton")
              : deliveryStatus === "failed"
                ? t("verifyEmailSent.resendAfterFailureButton")
                : t("verifyEmailSent.resendButton")}
          </>
        )}
      </Button>
      {isResendCoolingDown && (
        <p className="text-center ui-helper-text">
          {t("verifyEmailSent.cooldownRemainingLabel", {
            time: formatCooldown(resendCooldownRemainingMs),
          })}
        </p>
      )}
    </div>
  );
}

export function WrongEmailFooter({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useVerifyEmailSentTranslations();
  return (
    <p className="text-center ui-helper-text">
      {t("verifyEmailSent.wrongEmailLabel")}
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onSignOut}
        className="ml-1 h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
      >
        {t("verifyEmailSent.signOutAndRetryButton")}
      </Button>
    </p>
  );
}
