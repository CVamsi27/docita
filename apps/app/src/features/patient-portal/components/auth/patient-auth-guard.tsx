"use client";

import { PortalAuthGuard } from "@/components/auth/portal-auth-guard";

export function PatientAuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGuard
      requiredRole="PATIENT"
      loginPath="/portal/login"
      redirectPath="/dashboard"
      loadingLabel="Loading patient portal"
    >
      {children}
    </PortalAuthGuard>
  );
}
