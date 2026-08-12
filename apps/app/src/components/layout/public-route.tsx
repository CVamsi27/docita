import { Outlet, useLocation } from "react-router";
import type { ReactNode } from "react";

const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

/**
 * Wraps public auth page routes.
 * Renders children when the current path is a public auth path,
 * otherwise renders nested routes via Outlet.
 * This prevents an authenticated user from seeing login pages when
 * the ProtectedLayout redirect doesn't happen immediately.
 */
export function PublicRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (PUBLIC_AUTH_PATHS.includes(location.pathname)) {
    return <>{children}</>;
  }
  return <Outlet />;
}
