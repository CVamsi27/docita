"use client";

import { useEffect, useState } from "react";
import { ClinicRegistrationForm } from "@/features/onboarding/components/forms/clinic-registration-form";
import { useRouter } from "next/navigation";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { useAuth } from "@/lib/auth-context";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";

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
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  if (isFinalizingRedirect) {
    return (
      <PageTransitionLoader
        title="Finalizing your registration..."
        description="Taking you to your next step."
        fullscreen={false}
      />
    );
  }

  if (isLoading || !user) {
    return (
      <PageTransitionLoader
        title="Preparing onboarding..."
        description="Checking your account and saved progress."
        fullscreen={false}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8 space-y-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <DocitaLogo />
        </div>
        <h1 className="text-3xl font-bold">Welcome to Docita</h1>
        <p className="text-muted-foreground">
          Complete your clinic registration to get started.
        </p>
      </div>

      <ClinicRegistrationForm
        onSuccess={() => {
          setIsFinalizingRedirect(true);
          const destination =
            user?.role === "ADMIN_DOCTOR" ? "/verify-doctor" : "/dashboard";
          router.replace(destination);
        }}
      />
    </div>
  );
}
