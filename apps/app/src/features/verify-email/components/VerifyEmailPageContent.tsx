import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useTranslation } from "react-i18next";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle, XCircle } from "lucide-react";
import { sanitizeUserFacingMessage } from "@workspace/utils";
import { Button } from "@workspace/ui/components/form/button";
import { useAuth } from "@/lib/auth/auth-context";
import { VERIFICATION_EMAIL_STATUS_STORAGE_KEY } from "@/lib/auth/auth-context-helpers";
import { logger } from "@/lib/monitoring/logger";
import { getAppApiUrl } from "@/lib/api/api-config";
import { browserRequest } from "@/lib/auth/browser-request";
import { PreDashboardShell } from "@/features/auth";
import { BackButton } from "@/components/navigation/back-button";

type VerifyState = "loading" | "success" | "error" | "missing";

function VerifyEmailInner() {
  const { t } = useTranslation("Onboarding.verifyEmail");
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const invalidLinkMessage = t("invalidLink");
  const networkErrorMessage = t("networkError");

  useEffect(() => {
    if (!token) {
      setState("missing");
      return;
    }

    let cancelled = false;
    const apiUrl = getAppApiUrl();
    const base = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;

    async function verifyEmail() {
      try {
        const res = await browserRequest(`${base}auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (cancelled) {
          return;
        }
        if (res.ok) {
          setState("success");
          navigate("/verify-email/verified", { replace: true });
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.removeItem(
                VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
              );
            } catch (storageError) {
              logger.error("Could not clear email verification session state", {
                storageError,
              });
            }
          }
          try {
            await refreshUser();
          } catch (refreshError) {
            logger.error("Could not refresh user after email verification", {
              refreshError,
            });
          }
          return;
        }

        const data: unknown = await res.json().catch(() => ({}));
        const apiMessage =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : undefined;
        const safeMessage = sanitizeUserFacingMessage(apiMessage, invalidLinkMessage);
        setErrorMessage(safeMessage);
        setState("error");
      } catch (err) {
        if (cancelled) {
          return;
        }
        logger.error("Email verification request failed", { err });
        setErrorMessage(networkErrorMessage);
        setState("error");
      }
    }

    void verifyEmail();

    return () => {
      cancelled = true;
    };
    // The resolved messages are stable per render; re-running the verify
    // request on a language switch (their only change trigger) is worse
    // than a stale copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshUser, navigate, token]);

  const handleRequestNewLink = () => {
    navigate("/verify-email-sent");
  };

  return (
    <PreDashboardShell
      currentStep="verify-email"
      showBrandingPanel={false}
      showProgress={false}
    >
      <div className="ui-card-surface space-y-6 rounded-[var(--radius-xl)] p-8">
        {state === "loading" && (
          <div
            className="flex flex-col items-center gap-4 py-4"
            role="status"
            aria-live="polite"
            aria-label={t("verifyingAriaLabel")}
          >
            <DocitaLoadingIndicator
              variant="section"
              withStatusRole={false}
              iconClassName="h-10 w-10 text-primary"
            />
            <p className="ui-page-subtitle">{t("verifying")}</p>
          </div>
        )}

        {state === "success" && (
          <div
            className="flex flex-col items-center gap-4 py-4"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-10 w-10 text-success" />
            <p className="text-sm font-semibold text-foreground">{t("verified")}</p>
          </div>
        )}

        {(state === "error" || state === "missing") && (
          <div className="space-y-6">
            <div className="relative mx-auto w-fit">
              <div
                aria-hidden
                className="absolute inset-0 scale-110 rounded-full bg-destructive/20 blur-md"
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-destructive/25 bg-destructive/[0.1] text-destructive shadow-sm">
                <XCircle className="h-8 w-8" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-center ui-copy-stack">
              <h1 className="ui-page-title">{t("failedTitle")}</h1>
              <p className="ui-page-subtitle">
                {state === "missing" ? t("missingDescription") : errorMessage}
              </p>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleRequestNewLink}
              >
                {t("requestNewLink")}
              </Button>
              <BackButton
                fallback="/login"
                label={t("backToLogin")}
                variant="ghost"
                size="default"
                className="w-full h-11"
              />
            </div>
          </div>
        )}
      </div>
    </PreDashboardShell>
  );
}

export default function VerifyEmailPageContent() {
  const { t } = useTranslation("Onboarding.verifyEmail");
  return (
    <Suspense
      fallback={
        <PreDashboardShell
          currentStep="verify-email"
          showBrandingPanel={false}
          showProgress={false}
        >
          <div className="ui-card-surface space-y-6 p-8">
            <div
              className="flex flex-col items-center gap-4 py-4"
              role="status"
              aria-live="polite"
              aria-label={t("loadingAriaLabel")}
            >
              <DocitaLoadingIndicator
                variant="section"
                withStatusRole={false}
                iconClassName="h-10 w-10 text-primary"
              />
              <p className="ui-page-subtitle">{t("loading")}</p>
            </div>
          </div>
        </PreDashboardShell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
