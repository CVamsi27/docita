"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  Clinic,
  UpdateDoctorRegistrationRequest,
  User,
} from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useAPIQuery, useAPIMutation } from "@/lib/api/api-core";
import { useGenerateSignatureToken } from "@workspace/data-access";
import { toAbsoluteApiUrl, toAbsoluteAppUrl } from "@/lib/utils/url";
import { usePhoneSignatureQrFlow } from "@/hooks/use-phone-signature-qr-flow";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { shouldRedirectToWorkspace } from "@/features/onboarding/lib/redirect-logic";
import { extractRegistrationFieldError } from "@/features/onboarding/components/verify-doctor/helpers";

/**
 * Owns all data, state, and effects for the verify-doctor page.
 * Returns the orchestrator-friendly shape consumed by VerifyDoctorPageContent
 * and its section sub-components.
 */
export function useVerifyDoctor() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationCouncil, setRegistrationCouncil] = useState("");
  const [registrationStateCode, setRegistrationStateCode] = useState("");
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [isApplyingOnboardingSignature, setIsApplyingOnboardingSignature] =
    useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isDoctor = user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
  const isAdminDoctor = user?.role === "ADMIN_DOCTOR";
  const generateSignatureToken = useGenerateSignatureToken();

  const {
    data: doctorProfile,
    isLoading: profileLoading,
    refetch,
  } = useAPIQuery<User>(
    ["doctor-profile", user?.id ?? ""],
    `/doctors/${user?.id}`,
    { enabled: !!user?.id && isDoctor },
  );

  const { data: clinic, isLoading: clinicLoading } = useAPIQuery<Clinic>(
    ["clinic-settings", user?.clinicId ?? ""],
    "/clinic/settings",
    { enabled: !!user?.clinicId && isDoctor },
  );

  const updateDoctorRegistration = useAPIMutation<
    User,
    UpdateDoctorRegistrationRequest
  >(`/doctors/${user?.id}/registration-number`, "PUT", {
    invalidateKeys: [["doctor-profile", user?.id ?? ""]],
  });

  const updateDoctorSignature = useAPIMutation<User, { signatureUrl: string }>(
    `/doctors/${user?.id}`,
    "PUT",
    { invalidateKeys: [["doctor-profile", user?.id ?? ""]] },
  );

  const profile = doctorProfile ?? user;
  const hasSignature = !!profile?.signatureUrl;
  const hasSavedRegistration = !!profile?.registrationNumber;
  const hasDraftRegistration = registrationNumber.trim().length > 0;
  const hasRegistrationProgress = hasSavedRegistration || hasDraftRegistration;
  const canContinue = hasSignature && hasRegistrationProgress;
  const canAutoRedirect = shouldRedirectToWorkspace(
    hasSignature,
    hasSavedRegistration,
  );

  const onboardingSignatureUrl = clinic?.slaSignatureUrl ?? null;
  const onboardingSignatureStoredUrl = clinic?.slaSignatureStoredUrl ?? null;
  const onboardingSignatureSourceUrl =
    onboardingSignatureStoredUrl ?? onboardingSignatureUrl;
  const resolvedOnboardingSignatureUrl = onboardingSignatureSourceUrl
    ? toAbsoluteApiUrl(onboardingSignatureSourceUrl)
    : null;
  const resolvedProfileSignatureUrl = profile?.signatureUrl
    ? toAbsoluteApiUrl(profile.signatureUrl)
    : null;
  const canUseOnboardingSignature =
    isAdminDoctor && Boolean(onboardingSignatureSourceUrl) && !hasSignature;
  const shouldDeferQrAutoStart = isAdminDoctor && clinicLoading;

  useEffect(() => {
    if (!doctorProfile) return;
    setRegistrationCouncil(doctorProfile.registrationCouncil ?? "");
    setRegistrationStateCode(doctorProfile.registrationStateCode ?? "");
  }, [doctorProfile]);

  const createSignatureSession = useCallback(async () => {
    const token = await generateSignatureToken.mutateAsync();
    return {
      sessionId: token.token,
      qrUrl: toAbsoluteAppUrl(token.uploadUrl),
    };
  }, [generateSignatureToken]);

  const checkSignatureUploaded = useCallback(async () => {
    const result = await refetch();
    const refreshedProfile = result.data ?? doctorProfile ?? user;
    return Boolean(refreshedProfile?.signatureUrl);
  }, [doctorProfile, refetch, user]);

  const signatureQrFlow = usePhoneSignatureQrFlow({
    createSession: createSignatureSession,
    checkUploaded: checkSignatureUploaded,
    onUploaded: () => {
      toast.success("Signature received from your phone");
    },
    persistenceKey: `docita_verify_doctor_qr_session_${user?.id ?? "anonymous"}`,
    autoStart:
      !hasSignature && !canUseOnboardingSignature && !shouldDeferQrAutoStart,
    initialUploaded: hasSignature,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsRedirecting(true);
      router.replace("/login?next=/verify-doctor");
      return;
    }

    if (!isDoctor) {
      setIsRedirecting(true);
      router.replace("/today");
      return;
    }

    if (canAutoRedirect) {
      setIsRedirecting(true);
      router.replace("/today");
    }
  }, [authLoading, user, isDoctor, canAutoRedirect, router]);

  const handleUseOnboardingSignature = useCallback(async () => {
    if (!onboardingSignatureSourceUrl) return;

    setIsApplyingOnboardingSignature(true);
    try {
      await updateDoctorSignature.mutateAsync({
        signatureUrl: onboardingSignatureSourceUrl,
      });
      toast.success("Onboarding signature added to your profile");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not use the signature uploaded during onboarding. Please try again.",
        "save",
      );
    } finally {
      setIsApplyingOnboardingSignature(false);
    }
  }, [onboardingSignatureSourceUrl, updateDoctorSignature]);

  const handleSaveRegistration = useCallback(async (): Promise<boolean> => {
    if (!registrationNumber.trim()) return false;
    setIsSavingReg(true);
    setRegistrationError(null);
    try {
      const payload: UpdateDoctorRegistrationRequest = {
        registrationNumber: registrationNumber.trim(),
      };
      const council = registrationCouncil.trim();
      const region = registrationStateCode.trim();
      if (council) payload.registrationCouncil = council;
      if (region) payload.registrationStateCode = region;

      await updateDoctorRegistration.mutateAsync(payload);
      await refetch();
      toast.success("Registration number saved");
      setRegistrationNumber("");
      return true;
    } catch (error) {
      const fieldError = extractRegistrationFieldError(error);
      if (fieldError) {
        setRegistrationError(fieldError);
        showUserFacingErrorToast(null, fieldError, "form");
        return false;
      }
      showUserFacingErrorToast(
        error,
        "We could not save this registration number. Please try again.",
        "save",
      );
      return false;
    } finally {
      setIsSavingReg(false);
    }
  }, [
    registrationNumber,
    registrationCouncil,
    registrationStateCode,
    updateDoctorRegistration,
    refetch,
  ]);

  const handleContinue = useCallback(async () => {
    if (!hasSignature) return;
    if (!hasSavedRegistration && !registrationNumber.trim()) {
      setRegistrationError("Please enter your registration number");
      return;
    }

    try {
      if (!hasSavedRegistration) {
        const saved = await handleSaveRegistration();
        if (!saved) return;
      }

      setIsRedirecting(true);
      await refreshUser();
      router.replace("/today");
    } catch {
      setIsRedirecting(false);
      showUserFacingErrorToast(
        "We could not finish this verification step. Please try again.",
      );
    }
  }, [
    hasSignature,
    hasSavedRegistration,
    registrationNumber,
    handleSaveRegistration,
    refreshUser,
    router,
  ]);

  const isInitialLoading =
    authLoading ||
    (!!user?.id && isDoctor && profileLoading && !doctorProfile) ||
    !user ||
    !isDoctor ||
    canAutoRedirect;

  return {
    isRedirecting,
    isInitialLoading,
    profile,
    hasSignature,
    hasSavedRegistration,
    hasDraftRegistration,
    hasRegistrationProgress,
    canContinue,
    canUseOnboardingSignature,
    resolvedOnboardingSignatureUrl,
    resolvedProfileSignatureUrl,
    isApplyingOnboardingSignature,
    isSavingReg,
    registrationNumber,
    setRegistrationNumber,
    registrationCouncil,
    setRegistrationCouncil,
    registrationStateCode,
    setRegistrationStateCode,
    registrationError,
    setRegistrationError,
    signatureQrFlow,
    handleUseOnboardingSignature,
    handleSaveRegistration,
    handleContinue,
  };
}

export type UseVerifyDoctorReturn = ReturnType<typeof useVerifyDoctor>;
