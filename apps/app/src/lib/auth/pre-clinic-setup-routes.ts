export function shouldSkipAuthenticatedBootstrapFetch(pathname: string): boolean {
  const skipPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/onboarding", "/choose-path", "/clinic-selection", "/verify-email", "/join-clinic", "/join-request-status"];
  return skipPaths.some((p) => pathname.startsWith(p));
}