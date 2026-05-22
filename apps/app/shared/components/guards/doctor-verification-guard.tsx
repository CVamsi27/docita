"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { appQueryKeys } from "@workspace/data-access";
import { useAPIQuery } from "@/lib/api/api-core";
import type { User } from "@workspace/types";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";

const VERIFICATION_ALLOWED_PATHS = ["/verify-doctor", "/login"];

export function DoctorVerificationGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDoctor = user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
  const isVerificationAllowedPath = VERIFICATION_ALLOWED_PATHS.some((p) =>
    pathname?.startsWith(p),
  );

  const {
    data: doctorProfile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    isError: profileError,
  } = useAPIQuery<User>(
    appQueryKeys.doctorProfile.detail(user?.id ?? ""),
    `/doctors/${user?.id}`,
    { enabled: !!user?.id && isDoctor, staleTime: 5 * 60 * 1000 },
  );

  const needsVerification =
    !!doctorProfile &&
    (!doctorProfile.signatureUrl || !doctorProfile.registrationNumber);

  const shouldRedirectToVerify =
    !!user && isDoctor && needsVerification && !isVerificationAllowedPath;

  useEffect(() => {
    if (!user || !isDoctor || profileLoading) return;
    if (!doctorProfile) return;
    if (shouldRedirectToVerify) {
      router.replace("/verify-doctor");
    }
  }, [
    user,
    isDoctor,
    doctorProfile,
    profileLoading,
    router,
    shouldRedirectToVerify,
  ]);

  const isCheckingVerification =
    !!user &&
    isDoctor &&
    !isVerificationAllowedPath &&
    !profileError &&
    (profileLoading || (profileFetching && !doctorProfile));

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
