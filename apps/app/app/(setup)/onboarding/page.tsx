"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";

const ClinicOnboardingWizard = dynamic(
  () =>
    import("@/features/onboarding/components").then((mod) => ({
      default: mod.ClinicOnboardingWizard,
    })),
  { ssr: false },
);

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setRedirectMessage("Redirecting to login...");
      router.replace("/login?next=/onboarding");
      return;
    }

    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setRedirectMessage(
        "Registration successful. Taking you to your dashboard...",
      );
      router.replace("/dashboard");
      return;
    }

    if (user?.onboardingStep === "JOINING_CLINIC") {
      setRedirectMessage("Taking you to your join request status...");
      router.replace("/join-request-status");
      return;
    }

    if (
      user?.onboardingStep === "CHOOSE_PATH" ||
      user?.onboardingStep === "NOT_STARTED"
    ) {
      setRedirectMessage("Taking you to facility setup choices...");
      router.replace("/choose-path");
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting..."
        description={redirectMessage}
      />
    );
  }

  return (
    <PreDashboardShell
      currentStep="onboarding"
      contentMaxWidth="max-w-3xl"
      contentAlignment="start"
      showSignOut
    >
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-normal">Set up your facility</h1>
        <p className="text-muted-foreground text-sm">
          Complete your facility registration to get started.
        </p>
      </div>

      <div
        className="animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "100ms" }}
      >
        <ClinicOnboardingWizard />
      </div>
    </PreDashboardShell>
  );
}
