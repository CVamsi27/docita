"use client";

import { useEffect, useState } from "react";
import { ClinicRegistrationForm } from "@/features/onboarding/components/forms/clinic-registration-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";

export function ClinicOnboardingWizard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isFinalizingRedirect, setIsFinalizingRedirect] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setIsFinalizingRedirect(true);
      router.replace("/login?next=/onboarding");
      return;
    }

    if (user.clinicId) {
      setIsFinalizingRedirect(true);
      router.replace("/today");
    }
  }, [isLoading, router, user]);

  if (isFinalizingRedirect) {
    return (
      <PageTransitionLoader
        title="Finalizing your registration…"
        description="Taking you to your next step"
        fullscreen={false}
      />
    );
  }

  if (isLoading || !user) {
    return (
      <PageTransitionLoader
        title="Preparing onboarding…"
        description="Checking your account and saved progress"
        fullscreen={false}
      />
    );
  }

  return (
    <ClinicRegistrationForm
      onSuccess={() => {
        setIsFinalizingRedirect(true);
        const destination =
          user?.role === "ADMIN_DOCTOR" ? ("/verify-doctor" as const) : ("/today" as const);
        router.replace(destination);
      }}
    />
  );
}
