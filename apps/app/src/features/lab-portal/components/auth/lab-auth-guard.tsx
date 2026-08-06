import { PortalAuthGuard } from "@/components/auth/portal-auth-guard";

export function LabAuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGuard
      requiredRole="LAB"
      loginPath="/lab-portal/login"
      redirectPath="/today"
      loadingLabel="Loading lab portal"
    >
      {children}
    </PortalAuthGuard>
  );
}
