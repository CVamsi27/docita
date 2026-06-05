"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { appQueryKeys } from "@workspace/data-access";
import type { User } from "@workspace/types";
import { useAPIQuery } from "@/lib/api/api-core";
import { useAuth } from "@/lib/auth/auth-context";
import { isDoctor as checkIsDoctorRole } from "@/lib/auth/permissions";
import {
  doctorProfileNeedsVerification,
  isDoctorVerificationAllowedPath,
  shouldBlockForDoctorVerification,
  shouldRedirectDoctorToVerification,
} from "./doctor-verification-guard-helpers";

export function useDoctorVerificationGuardState() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDoctor = checkIsDoctorRole(user?.role);
  const isVerificationAllowedPath =
    isDoctorVerificationAllowedPath(pathname);

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

  const needsVerification = doctorProfileNeedsVerification(doctorProfile);
  const shouldRedirectToVerify = shouldRedirectDoctorToVerification({
    userPresent: !!user,
    isDoctor,
    needsVerification,
    isVerificationAllowedPath,
  });

  useEffect(() => {
    if (shouldRedirectToVerify) {
      router.replace("/verify-doctor");
    }
  }, [router, shouldRedirectToVerify]);

  return {
    isCheckingVerification: shouldBlockForDoctorVerification({
      userPresent: !!user,
      isDoctor,
      isVerificationAllowedPath,
      profileError,
      profileLoading,
      profileFetching,
      doctorProfilePresent: !!doctorProfile,
    }),
    shouldRedirectToVerify,
  };
}
