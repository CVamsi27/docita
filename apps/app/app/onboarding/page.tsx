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
  { ssr: true },
);

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;

    if (user?.clinicId || user?.onboardingStep === 'COMPLETED') {
      setIsRedirecting(true);
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isRedirecting) {
    return (
      <PageTransitionLoader
        title="Registration successful"
        description="Taking you to your dashboard..."
      />
    );
  }

  return (
    <PreDashboardShell
      currentStep="onboarding"
      contentMaxWidth="max-w-3xl"
      showSignOut
    >
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">Set up your clinic</h1>
        <p className="text-muted-foreground text-sm">
          Complete your clinic registration to get started.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: "100ms" }}>
        <ClinicOnboardingWizard />
      </div>
    </PreDashboardShell>
  );
}
