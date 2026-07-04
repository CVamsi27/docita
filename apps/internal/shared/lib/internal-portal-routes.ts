/** Routes served by the Internal Console (see `app/(protected)`). */
export const PORTAL_ROUTE_PREFIXES = [
  "/dashboard",
  "/users",
  "/admins",
  "/payment-processing",
  "/billing",
  "/pricing",
  "/enterprise-contracts",
  "/analytics",
  "/system-monitoring",
  "/feedback",
  "/support",
  "/broadcasts",
  "/referrals",
  "/logs",
  "/audits",
  "/performance",
  "/doctors",
] as const;

export function isPortalPath(pathname: string): boolean {
  return PORTAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
