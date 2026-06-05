import type { User } from "@workspace/types";

const VERIFICATION_ALLOWED_PATHS = ["/verify-doctor", "/login"] as const;

export function isDoctorVerificationAllowedPath(
  pathname: string | null | undefined,
): boolean {
  return VERIFICATION_ALLOWED_PATHS.some((path) => pathname?.startsWith(path));
}

export function doctorProfileNeedsVerification(
  doctorProfile: Pick<User, "signatureUrl" | "registrationNumber"> | null | undefined,
): boolean {
  return (
    !!doctorProfile &&
    (!doctorProfile.signatureUrl || !doctorProfile.registrationNumber)
  );
}

export function shouldBlockForDoctorVerification({
  userPresent,
  isDoctor,
  isVerificationAllowedPath,
  profileError,
  profileLoading,
  profileFetching,
  doctorProfilePresent,
}: {
  userPresent: boolean;
  isDoctor: boolean;
  isVerificationAllowedPath: boolean;
  profileError: boolean;
  profileLoading: boolean;
  profileFetching: boolean;
  doctorProfilePresent: boolean;
}): boolean {
  return (
    userPresent &&
    isDoctor &&
    !isVerificationAllowedPath &&
    !profileError &&
    (profileLoading || (profileFetching && !doctorProfilePresent))
  );
}

export function shouldRedirectDoctorToVerification({
  userPresent,
  isDoctor,
  needsVerification,
  isVerificationAllowedPath,
}: {
  userPresent: boolean;
  isDoctor: boolean;
  needsVerification: boolean;
  isVerificationAllowedPath: boolean;
}): boolean {
  return (
    userPresent &&
    isDoctor &&
    needsVerification &&
    !isVerificationAllowedPath
  );
}
