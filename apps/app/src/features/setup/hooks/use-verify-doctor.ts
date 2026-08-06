import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type {
  Clinic,
  UpdateDoctorRegistrationRequest,
  User,
} from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useAPIQuery, useAPIMutation } from "@/lib/api/api-core";
import {
  appQueryKeys,
  useGenerateSignatureToken,
} from "@workspace/data-access";
import { toAbsoluteAppUrl } from "@/lib/utils/app-url";
import { isDoctor as checkIsDoctor } from "@/lib/auth/permissions";
import { usePhoneSignatureQrFlow } from "@/hooks/use-phone-signature-qr-flow";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";
import {
  resolveDoctorSignatureUrls,
  getDoctorRegistrationState,
  buildRegistrationPayload,
  type DoctorVerificationProfile,
  REGISTRATION_NUMBER_REQUIRED_ERROR,
} from "./verify-doctor-helpers";
import { handleRegistrationSaveError } from "./use-verify-doctor-error";
import { buildVerifyDoctorReturn } from "./use-verify-doctor-return";
import type {
  RegistrationInputState,
  VerifyDoctorQueries,
} from "./use-verify-doctor-types";

function getDoctorProfileUserId(
  user: DoctorVerificationProfile | null | undefined,
): string {
  return user?.id ?? "";
}

export function useVerifyDoctor() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const routerReplace = useCallback(
    (href: string) => navigate(href, { replace: true }),
    [navigate],
  );
  const isDoctor = checkIsDoctor(user?.role);
  const isAdminDoctor = isDoctor && user?.role === "ADMIN_DOCTOR";
  const redirect = useRedirectingState();
  const queries = useVerifyDoctorQueries(user, isDoctor);
  const input = useRegistrationInputState(queries.doctorProfile);
  const profile: DoctorVerificationProfile | null =
    queries.doctorProfile ?? user;

  const registrationState = getDoctorRegistrationState(
    profile,
    input.registrationNumber,
  );
  const signatureUrls = resolveDoctorSignatureUrls({
    clinic: queries.clinic,
    profile,
    isAdminDoctor,
    hasSignature: registrationState.hasSignature,
    clinicLoading: queries.clinicLoading,
  });

  useVerifyDoctorRedirect({
    authLoading,
    user,
    isDoctor,
    canAutoRedirect: registrationState.canAutoRedirect,
    routerReplace,
    setIsRedirecting: redirect.setIsRedirecting,
  });

  return useVerifyDoctorReturn({
    user,
    authLoading,
    isDoctor,
    routerReplace,
    refreshUser,
    profile,
    queries,
    input,
    registrationState,
    signatureUrls,
    redirect,
  });
}

function useRedirectingState() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  return { isRedirecting, setIsRedirecting };
}

function useVerifyDoctorReturn(params: {
  user: DoctorVerificationProfile | null | undefined;
  authLoading: boolean;
  isDoctor: boolean;
  routerReplace: (href: string) => void;
  refreshUser: () => Promise<DoctorVerificationProfile | null>;
  profile: DoctorVerificationProfile | null;
  queries: VerifyDoctorQueries;
  input: RegistrationInputState;
  registrationState: ReturnType<typeof getDoctorRegistrationState>;
  signatureUrls: ReturnType<typeof resolveDoctorSignatureUrls>;
  redirect: ReturnType<typeof useRedirectingState>;
}) {
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [isApplyingSignature, setIsApplyingSignature] = useState(false);
  const signatureQrFlow = useVerifyDoctorSignatureFlow(params);
  const handleSaveRegistration = useSaveRegistrationAction({
    input: params.input,
    updateDoctorRegistration: params.queries.updateDoctorRegistration,
    refetch: params.queries.refetch,
    setIsSavingReg,
  });
  const handleUseOnboardingSignature = useOnboardingSignatureAction({
    onboardingSignatureSourceUrl:
      params.signatureUrls.onboardingSignatureSourceUrl,
    updateDoctorSignature: params.queries.updateDoctorSignature,
    setIsApplyingSignature,
  });
  const handleContinue = useContinueVerificationAction({
    input: params.input,
    registrationState: params.registrationState,
    handleSaveRegistration,
    refreshUser: params.refreshUser,
    routerReplace: params.routerReplace,
    setIsRedirecting: params.redirect.setIsRedirecting,
  });

  return buildVerifyDoctorReturn({
    ...params,
    isRedirecting: params.redirect.isRedirecting,
    isSavingReg,
    isApplyingSignature,
    signatureQrFlow,
    handleUseOnboardingSignature,
    handleSaveRegistration,
    handleContinue,
  });
}

function useVerifyDoctorQueries(
  user: DoctorVerificationProfile | null | undefined,
  isDoctor: boolean,
): VerifyDoctorQueries {
  const userId = getDoctorProfileUserId(user);
  const doctorProfileQuery = useAPIQuery<User>(
    appQueryKeys.doctorProfile.detail(userId),
    `/doctors/${user?.id}`,
    { enabled: !!user?.id && isDoctor },
  );
  const clinicQuery = useAPIQuery<Clinic>(
    appQueryKeys.clinicSettings(user?.clinicId ?? ""),
    "/clinic/settings",
    { enabled: !!user?.clinicId && isDoctor },
  );
  return {
    doctorProfile: doctorProfileQuery.data,
    profileLoading: doctorProfileQuery.isLoading,
    refetch: doctorProfileQuery.refetch,
    clinic: clinicQuery.data,
    clinicLoading: clinicQuery.isLoading,
    updateDoctorRegistration: useAPIMutation<
      User,
      UpdateDoctorRegistrationRequest
    >(`/doctors/${user?.id}/registration-number`, "PUT", {
      invalidateKeys: [appQueryKeys.doctorProfile.detail(userId)],
    }),
    updateDoctorSignature: useAPIMutation<User, { signatureUrl: string }>(
      `/doctors/${user?.id}`,
      "PUT",
      { invalidateKeys: [appQueryKeys.doctorProfile.detail(userId)] },
    ),
  };
}

function useRegistrationInputState(
  doctorProfile: User | undefined,
): RegistrationInputState {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationCouncil, setRegistrationCouncil] = useState("");
  const [registrationStateCode, setRegistrationStateCode] = useState("");
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!doctorProfile) return;
    setRegistrationCouncil(doctorProfile.registrationCouncil ?? "");
    setRegistrationStateCode(doctorProfile.registrationStateCode ?? "");
  }, [doctorProfile]);

  return {
    registrationNumber,
    setRegistrationNumber,
    registrationCouncil,
    setRegistrationCouncil,
    registrationStateCode,
    setRegistrationStateCode,
    registrationError,
    setRegistrationError,
  };
}

function useVerifyDoctorRedirect(params: {
  authLoading: boolean;
  user: DoctorVerificationProfile | null | undefined;
  isDoctor: boolean;
  canAutoRedirect: boolean;
  routerReplace: (href: string) => void;
  setIsRedirecting: (value: boolean) => void;
}): void {
  const {
    authLoading,
    user,
    isDoctor,
    canAutoRedirect,
    routerReplace,
    setIsRedirecting,
  } = params;
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsRedirecting(true);
      persistReturnPathBeforeLogin();
      routerReplace("/login");
      return;
    }
    if (!isDoctor) {
      setIsRedirecting(true);
      routerReplace("/today");
      return;
    }
    if (canAutoRedirect) {
      setIsRedirecting(true);
      routerReplace("/today");
    }
  }, [
    authLoading,
    user,
    isDoctor,
    canAutoRedirect,
    routerReplace,
    setIsRedirecting,
  ]);
}

function useVerifyDoctorSignatureFlow(params: {
  user: DoctorVerificationProfile | null | undefined;
  queries: VerifyDoctorQueries;
  registrationState: ReturnType<typeof getDoctorRegistrationState>;
  signatureUrls: ReturnType<typeof resolveDoctorSignatureUrls>;
}) {
  const generateSignatureToken = useGenerateSignatureToken();
  const createSignatureSession = useCallback(async () => {
    const token = await generateSignatureToken.mutateAsync();
    return {
      sessionId: token.token,
      qrUrl: toAbsoluteAppUrl(token.uploadUrl),
    };
  }, [generateSignatureToken]);
  const checkSignatureUploaded = useCallback(async () => {
    const result = await params.queries.refetch();
    const refreshed = result.data ?? params.queries.doctorProfile ?? params.user;
    return Boolean(refreshed?.signatureUrl);
  }, [params]);

  return usePhoneSignatureQrFlow({
    createSession: createSignatureSession,
    checkUploaded: checkSignatureUploaded,
    onUploaded: () => toast.success("Signature received from your phone"),
    persistenceKey: `docita_verify_doctor_qr_session_${params.user?.id ?? "anonymous"}`,
    autoStart:
      !params.registrationState.hasSignature &&
      !params.signatureUrls.canUseOnboardingSignature &&
      !params.signatureUrls.shouldDeferQrAutoStart,
    initialUploaded: params.registrationState.hasSignature,
  });
}

function useOnboardingSignatureAction(params: {
  onboardingSignatureSourceUrl: string | null;
  updateDoctorSignature: VerifyDoctorQueries["updateDoctorSignature"];
  setIsApplyingSignature: (value: boolean) => void;
}) {
  return useCallback(async () => {
    if (!params.onboardingSignatureSourceUrl) return;
    params.setIsApplyingSignature(true);
    try {
      await params.updateDoctorSignature.mutateAsync({
        signatureUrl: params.onboardingSignatureSourceUrl,
      });
      toast.success("Onboarding signature added to your profile");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not use the signature uploaded during onboarding. Please try again.",
        "save",
      );
    } finally {
      params.setIsApplyingSignature(false);
    }
  }, [params]);
}

function useSaveRegistrationAction(params: {
  input: RegistrationInputState;
  updateDoctorRegistration: VerifyDoctorQueries["updateDoctorRegistration"];
  refetch: VerifyDoctorQueries["refetch"];
  setIsSavingReg: (value: boolean) => void;
}) {
  return useCallback(async (): Promise<boolean> => {
    if (!params.input.registrationNumber.trim()) return false;
    params.setIsSavingReg(true);
    params.input.setRegistrationError(null);
    try {
      await params.updateDoctorRegistration.mutateAsync(
        buildRegistrationPayload(params.input),
      );
      await params.refetch();
      toast.success("Registration number saved");
      params.input.setRegistrationNumber("");
      return true;
    } catch (error) {
      return handleRegistrationSaveError(error, params.input);
    } finally {
      params.setIsSavingReg(false);
    }
  }, [params]);
}

function useContinueVerificationAction(params: {
  input: RegistrationInputState;
  registrationState: ReturnType<typeof getDoctorRegistrationState>;
  handleSaveRegistration: () => Promise<boolean>;
  refreshUser: () => Promise<DoctorVerificationProfile | null>;
  routerReplace: (href: string) => void;
  setIsRedirecting: (value: boolean) => void;
}) {
  return useCallback(async () => {
    if (!params.registrationState.hasSignature) return;
    if (
      !params.registrationState.hasSavedRegistration &&
      !params.input.registrationNumber.trim()
    ) {
      params.input.setRegistrationError(REGISTRATION_NUMBER_REQUIRED_ERROR);
      return;
    }
    try {
      if (!params.registrationState.hasSavedRegistration) {
        const saved = await params.handleSaveRegistration();
        if (!saved) return;
      }
      params.setIsRedirecting(true);
      await params.refreshUser();
      params.routerReplace("/today");
    } catch {
      params.setIsRedirecting(false);
      showUserFacingErrorToast(
        undefined,
        "We could not finish this verification step. Please try again.",
      );
    }
  }, [params]);
}

export type UseVerifyDoctorReturn = ReturnType<typeof useVerifyDoctor>;
