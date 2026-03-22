"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";

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

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;

    if (user?.clinicId || user?.onboardingStep === 'COMPLETED') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <main className="relative min-h-screen bg-background py-8 md:py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <ClinicOnboardingWizard />
    </main>
  );
}
