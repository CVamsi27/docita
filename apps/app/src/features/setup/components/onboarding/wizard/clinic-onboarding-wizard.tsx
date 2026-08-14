"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { ClinicRegistrationForm } from "@/features/setup/components/onboarding/forms/clinic-registration-form";

export function ClinicOnboardingWizard() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isFinalizingRedirect, setIsFinalizingRedirect] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setIsFinalizingRedirect(true);
      navigate("/login?next=/onboarding", { replace: true });
      return;
    }

    if (user.clinicId) {
      setIsFinalizingRedirect(true);
      navigate("/today", { replace: true });
    }
  }, [isLoading, navigate, user]);

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
        navigate(destination, { replace: true });
      }}
    />
  );
}
