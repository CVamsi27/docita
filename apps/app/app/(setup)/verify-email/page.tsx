"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { sanitizeUserFacingMessage } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import {
  useAuth,
  VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
} from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { API_URL } from "@/lib/api-config";
import { SupportContact } from "@/components/common/support-contact";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/common/navigation/back-button";

type VerifyState = "loading" | "success" | "error" | "missing";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("missing");
      return;
    }

    let cancelled = false;
    const base = API_URL.endsWith("/") ? API_URL : `${API_URL}/`;

    async function verifyEmail() {
      try {
        const res = await fetch(`${base}auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (cancelled) {
          return;
        }

        if (res.ok) {
          setState("success");
          router.replace("/verify-email/verified");
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

        const data = await res.json().catch(() => ({}));
        const safeMessage = sanitizeUserFacingMessage(
          (data as { message?: string }).message,
          "The verification link is invalid or has expired",
        );
        setErrorMessage(safeMessage);
        setState("error");
      } catch (err) {
        if (cancelled) {
          return;
        }
        logger.error("Email verification request failed", { err });
        setErrorMessage("We could not verify this email link. Please try again.");
        setState("error");
      }
    }

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [refreshUser, router, token]);

  const handleRequestNewLink = () => {
    router.push("/verify-email-sent");
  };

  return (
    <PreDashboardShell currentStep="verify-email">
      <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              Verifying your email...
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="flex flex-col items-center gap-4 py-4" role="status" aria-live="polite">
            <CheckCircle className="h-10 w-10 text-success" />
            <p className="text-sm font-semibold text-foreground">Verified</p>
          </div>
        )}

        {(state === "error" || state === "missing") && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-normal">Verification failed</h1>
              <p className="text-muted-foreground text-sm">
                {state === "missing"
                  ? "No verification link was found. Please use the link from your email."
                  : errorMessage}
              </p>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleRequestNewLink}
              >
                Request a new link
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
        )}
      </div>

      <SupportContact />
    </PreDashboardShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <PreDashboardShell currentStep="verify-email">
          <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-8 shadow-xl space-y-6">
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading…</p>
            </div>
          </div>
        </PreDashboardShell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
