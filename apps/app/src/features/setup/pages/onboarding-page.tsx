"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth";
import { ClinicOnboardingWizard } from "@/features/setup/components/onboarding";

export function OnboardingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setRedirectMessage("Redirecting to login…");
      navigate("/login?next=/onboarding", { replace: true });
      return;
    }
    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setRedirectMessage(
        "Registration successful. Taking you to your workspace…",
      );
      navigate("/today", { replace: true });
      return;
    }
    if (user?.onboardingStep === "JOINING_CLINIC") {
      setRedirectMessage("Taking you to your join request status…");
      navigate("/join-request-status", { replace: true });
      return;
    }
    if (
      user?.onboardingStep === "CHOOSE_PATH" ||
      user?.onboardingStep === "NOT_STARTED"
    ) {
      setRedirectMessage("Taking you to facility setup choices…");
      navigate("/choose-path", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);
  if (redirectMessage)
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description={redirectMessage}
      />
    );

  return (
    <PreDashboardShell
      currentStep="onboarding"
      contentMaxWidth="max-w-5xl"
      showBrandingPanel={false}
      showProgress={false}
      showSignOut
    >
      <div className="mx-auto w-full max-w-3xl space-y-1.5">
        <p className="ui-eyebrow">Facility setup</p>
        <h1 className="ui-page-title">Set up your facility</h1>
        <p className="ui-page-subtitle">
          Complete your facility registration to get started.
        </p>
      </div>

      <ClinicOnboardingWizard />
    </PreDashboardShell>
  );
}
