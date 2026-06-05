"use client";

import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { useDoctorVerificationGuardState } from "./use-doctor-verification-guard-state";

export function DoctorVerificationGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCheckingVerification, shouldRedirectToVerify } =
    useDoctorVerificationGuardState();

  if (isCheckingVerification || shouldRedirectToVerify) {
    return (
      <PageTransitionLoader
        title="Checking your profile…"
        description="Verifying your doctor profile before loading your workspace"
      />
    );
  }

  return <>{children}</>;
}
