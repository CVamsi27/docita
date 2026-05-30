/** Routes where the user may be authenticated but has not finished clinic setup. */
export const PRE_CLINIC_SETUP_ROUTE_PREFIXES = [
  "/login",
  "/register",
  "/onboarding",
  "/choose-path",
  "/join-request-status",
  "/join-clinic",
  "/verify-email-sent",
  "/verify-email",
  "/clinic-selection",
] as const;

export function isPreClinicSetupRoute(pathname: string): boolean {
  return PRE_CLINIC_SETUP_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function shouldSkipAuthenticatedBootstrapFetch(
  pathname: string,
): boolean {
  return isPreClinicSetupRoute(pathname);
}
