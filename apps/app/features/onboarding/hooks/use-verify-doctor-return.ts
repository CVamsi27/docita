"use client";

import { usePhoneSignatureQrFlow } from "@/hooks/use-phone-signature-qr-flow";
import {
  getDoctorRegistrationState,
  getIsInitialLoading,
  resolveDoctorSignatureUrls,
  type DoctorVerificationProfile,
} from "./verify-doctor-helpers";
import type {
  RegistrationInputState,
  VerifyDoctorQueries,
} from "./use-verify-doctor-types";

export function buildVerifyDoctorReturn(params: {
  user: DoctorVerificationProfile | null | undefined;
  authLoading: boolean;
  isDoctor: boolean;
  isRedirecting: boolean;
  isSavingReg: boolean;
  isApplyingSignature: boolean;
  profile: DoctorVerificationProfile | null;
  queries: VerifyDoctorQueries;
  input: RegistrationInputState;
  registrationState: ReturnType<typeof getDoctorRegistrationState>;
  signatureUrls: ReturnType<typeof resolveDoctorSignatureUrls>;
  signatureQrFlow: ReturnType<typeof usePhoneSignatureQrFlow>;
  handleUseOnboardingSignature: () => Promise<void>;
  handleSaveRegistration: () => Promise<boolean>;
  handleContinue: () => Promise<void>;
}) {
  return {
    isRedirecting: params.isRedirecting,
    isInitialLoading: getIsInitialLoading({
      authLoading: params.authLoading,
      user: params.user,
      isDoctor: params.isDoctor,
      profileLoading: params.queries.profileLoading,
      doctorProfile: params.queries.doctorProfile,
      canAutoRedirect: params.registrationState.canAutoRedirect,
    }),
    profile: params.profile,
    hasSignature: params.registrationState.hasSignature,
    hasSavedRegistration: params.registrationState.hasSavedRegistration,
    hasDraftRegistration: params.registrationState.hasDraftRegistration,
    hasRegistrationProgress: params.registrationState.hasRegistrationProgress,
    canContinue: params.registrationState.canContinue,
    canUseOnboardingSignature:
      params.signatureUrls.canUseOnboardingSignature,
    resolvedOnboardingSignatureUrl:
      params.signatureUrls.resolvedOnboardingSignatureUrl,
    resolvedProfileSignatureUrl: params.signatureUrls.resolvedProfileSignatureUrl,
    isApplyingOnboardingSignature: params.isApplyingSignature,
    isSavingReg: params.isSavingReg,
    registrationNumber: params.input.registrationNumber,
    setRegistrationNumber: params.input.setRegistrationNumber,
    registrationCouncil: params.input.registrationCouncil,
    setRegistrationCouncil: params.input.setRegistrationCouncil,
    registrationStateCode: params.input.registrationStateCode,
    setRegistrationStateCode: params.input.setRegistrationStateCode,
    registrationError: params.input.registrationError,
    setRegistrationError: params.input.setRegistrationError,
    signatureQrFlow: params.signatureQrFlow,
    handleUseOnboardingSignature: params.handleUseOnboardingSignature,
    handleSaveRegistration: params.handleSaveRegistration,
    handleContinue: params.handleContinue,
  };
}
