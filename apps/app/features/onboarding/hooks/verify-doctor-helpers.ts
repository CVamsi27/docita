"use client";

import type { Clinic, UpdateDoctorRegistrationRequest, User } from "@workspace/types";
import { toAbsoluteApiUrl } from "@/lib/utils/url";
import { shouldRedirectToWorkspace } from "@/features/onboarding/lib/redirect-logic";

export interface ResolvedSignatureUrls {
  onboardingSignatureSourceUrl: string | null;
  resolvedOnboardingSignatureUrl: string | null;
  resolvedProfileSignatureUrl: string | null;
  canUseOnboardingSignature: boolean;
  shouldDeferQrAutoStart: boolean;
}

export function resolveDoctorSignatureUrls(params: {
  clinic: Clinic | null | undefined;
  profile: User | null | undefined;
  isAdminDoctor: boolean;
  hasSignature: boolean;
  clinicLoading: boolean;
}): ResolvedSignatureUrls {
  const onboardingSignatureUrl = params.clinic?.slaSignatureUrl ?? null;
  const onboardingSignatureStoredUrl =
    params.clinic?.slaSignatureStoredUrl ?? null;
  const onboardingSignatureSourceUrl =
    onboardingSignatureStoredUrl ?? onboardingSignatureUrl;
  const resolvedOnboardingSignatureUrl = onboardingSignatureSourceUrl
    ? toAbsoluteApiUrl(onboardingSignatureSourceUrl)
    : null;
  const resolvedProfileSignatureUrl = params.profile?.signatureUrl
    ? toAbsoluteApiUrl(params.profile.signatureUrl)
    : null;
  const canUseOnboardingSignature =
    params.isAdminDoctor &&
    Boolean(onboardingSignatureSourceUrl) &&
    !params.hasSignature;
  const shouldDeferQrAutoStart = params.isAdminDoctor && params.clinicLoading;
  return {
    onboardingSignatureSourceUrl,
    resolvedOnboardingSignatureUrl,
    resolvedProfileSignatureUrl,
    canUseOnboardingSignature,
    shouldDeferQrAutoStart,
  };
}

export interface DoctorRegistrationState {
  hasSignature: boolean;
  hasSavedRegistration: boolean;
  hasDraftRegistration: boolean;
  hasRegistrationProgress: boolean;
  canContinue: boolean;
  canAutoRedirect: boolean;
}

export function getDoctorRegistrationState(
  profile: User | null | undefined,
  registrationNumber: string,
): DoctorRegistrationState {
  const hasSignature = !!profile?.signatureUrl;
  const hasSavedRegistration = !!profile?.registrationNumber;
  const hasDraftRegistration = registrationNumber.trim().length > 0;
  const hasRegistrationProgress = hasSavedRegistration || hasDraftRegistration;
  const canContinue = hasSignature && hasRegistrationProgress;
  const canAutoRedirect = shouldRedirectToWorkspace(
    hasSignature,
    hasSavedRegistration,
  );
  return {
    hasSignature,
    hasSavedRegistration,
    hasDraftRegistration,
    hasRegistrationProgress,
    canContinue,
    canAutoRedirect,
  };
}

export function getIsInitialLoading(params: {
  authLoading: boolean;
  user: User | null | undefined;
  isDoctor: boolean;
  profileLoading: boolean;
  doctorProfile: User | null | undefined;
  canAutoRedirect: boolean;
}): boolean {
  return (
    params.authLoading ||
    (!!params.user?.id &&
      params.isDoctor &&
      params.profileLoading &&
      !params.doctorProfile) ||
    !params.user ||
    !params.isDoctor ||
    params.canAutoRedirect
  );
}

export const REGISTRATION_NUMBER_REQUIRED_ERROR =
  "Please enter your registration number";

export function buildRegistrationPayload(params: {
  registrationNumber: string;
  registrationCouncil: string;
  registrationStateCode: string;
}): UpdateDoctorRegistrationRequest {
  const payload: UpdateDoctorRegistrationRequest = {
    registrationNumber: params.registrationNumber.trim(),
  };
  const council = params.registrationCouncil.trim();
  const region = params.registrationStateCode.trim();
  if (council) payload.registrationCouncil = council;
  if (region) payload.registrationStateCode = region;
  return payload;
}
