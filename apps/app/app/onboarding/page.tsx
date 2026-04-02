"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";

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
    <main className="relative min-h-screen bg-background py-8 md:py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <ClinicOnboardingWizard />
    </main>
  );
}
