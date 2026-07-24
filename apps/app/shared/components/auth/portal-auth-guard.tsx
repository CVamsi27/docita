"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { UserRole } from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";

interface PortalAuthGuardProps {
  /** Role required to view the children. Any other authenticated role is bounced to `redirectPath`. */
  requiredRole: UserRole;
  /** Path to push unauthenticated visitors to (typically the portal's login page). */
  loginPath: string;
  /** Path to push authenticated users with the wrong role to (typically the main app). */
  redirectPath: string;
  /** Text announced by screen readers while the auth context is resolving. */
  loadingLabel: string;
  children: ReactNode;
}

/**
 * Shared auth gate for the patient and lab portals. Renders a centered
 * `role="status"` loading indicator while the auth context resolves, then
 * either renders the children (correct role), redirects to the login
 * path (no session), or redirects to the cross-portal path (wrong role).
 *
 * Centralizing the loading + redirect contract here keeps the two portal
 * guards in lockstep on a11y and behavior; previously they were 95%
 * duplicated and drifted on the loading markup.
 */
export function PortalAuthGuard({
  requiredRole,
  loginPath,
  redirectPath,
  loadingLabel,
  children,
}: PortalAuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(loginPath);
      return;
    }
    if (user.role !== requiredRole) {
      router.replace(redirectPath);
    }
  }, [user, isLoading, router, loginPath, redirectPath, requiredRole]);

  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center px-4"
        role="status"
        aria-live="polite"
        aria-label={loadingLabel}
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-10 w-10 text-primary"
        />
      </div>
    );
  }

  if (!user || user.role !== requiredRole) return null;

  return <>{children}</>;
}
