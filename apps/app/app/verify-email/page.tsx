"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { AuthBrandingPanel } from "@/features/auth/components/AuthBrandingPanel";
import { useAuth, type User } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { API_URL } from "@/lib/api-config";
import { SupportContact } from "@/components/common/support-contact";

type VerifyState = "loading" | "success" | "error" | "missing";

function getPostVerificationPath(user: User | null): string {
  if (user?.clinicId) {
    return "/dashboard";
  }

  switch (user?.onboardingStep) {
    case "JOINING_CLINIC":
      return "/join-request-status";
    case "CREATING_CLINIC":
      return "/onboarding";
    default:
      return "/choose-path";
  }
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const latestUserRef = useRef<User | null>(user);
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    const token = searchParams.get("token");
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
          const refreshedUser = await refreshUser();
          if (!cancelled) {
            router.replace(
              getPostVerificationPath(refreshedUser ?? latestUserRef.current),
            );
          }
          return;
        }

        const data = await res.json().catch(() => ({}));
        const msg =
          (data as { message?: string }).message ||
          "The verification link is invalid or has expired.";
        setErrorMessage(msg);
        setState("error");
      } catch (err) {
        if (cancelled) {
          return;
        }
        logger.error("Email verification request failed", { err });
        setErrorMessage("Something went wrong. Please try again.");
        setState("error");
      }
    }

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [refreshUser, router, searchParams]);

  const handleRequestNewLink = () => {
    router.push("/verify-email-sent");
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandingPanel />

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-10 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 60% 40%, oklch(var(--primary) / 0.04) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="lg:hidden flex justify-center">
            <DocitaLogo />
          </div>

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
              <div className="space-y-6" role="status" aria-live="polite">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-success/10">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">Email verified</h1>
                  <p className="text-muted-foreground text-sm">
                    Your account is ready. Taking you to the next step...
                  </p>
                </div>
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
                  <h1 className="text-2xl font-bold">Verification failed</h1>
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
                  <Button
                    variant="ghost"
                    className="w-full h-11"
                    onClick={handleBackToLogin}
                  >
                    Back to login
                  </Button>
                </div>
              </div>
            )}
          </div>

          <SupportContact />
        </div>
      </div>
    </div>
  );
}
