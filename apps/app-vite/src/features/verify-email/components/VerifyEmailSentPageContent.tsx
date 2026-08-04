import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth, VERIFICATION_EMAIL_STATUS_STORAGE_KEY } from "@/lib/auth/auth-context";
import { logger } from "@/lib/monitoring/logger";
import { resendVerificationEmail } from "@/features/auth";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth";
import { EmailVerifiedContent, CheckEmailHero, CheckEmailMessage, DeliveryStatusBanner, ResendButtonSection, WrongEmailFooter } from "./VerifyEmailSentPageContentSections";
import { getNextPathForVerifiedUser } from "../lib/verified-user-routing";

const VERIFICATION_EMAIL_COOLDOWN_MS = 120 * 1000;
const VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY =
  "docita_verification_email_resend_available_at";

export default function VerifyEmailSentPageContent() {
  const navigate = useNavigate();
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
      navigate("/login?next=/verify-email-sent", { replace: true });
      return;
    }

    if (user.emailVerified === true) {
      setRedirectMessage(null);
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
  }, [navigate, user]);

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
          <EmailVerifiedContent
            onContinue={() => navigate(getNextPathForVerifiedUser(user, "/verify-email-sent"))}
          />
        </div>
      </PreDashboardShell>
    );
  }

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
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
        <CheckEmailHero />
        <CheckEmailMessage email={email} />
        <DeliveryStatusBanner deliveryStatus={deliveryStatus} />
        <ResendButtonSection
          resending={resending}
          isResendCoolingDown={isResendCoolingDown}
          resendCooldownRemainingMs={resendCooldownRemainingMs}
          deliveryStatus={deliveryStatus}
          onResend={handleResend}
        />
        <WrongEmailFooter onSignOut={() => void logout()} />
      </div>
    </PreDashboardShell>
  );
}
