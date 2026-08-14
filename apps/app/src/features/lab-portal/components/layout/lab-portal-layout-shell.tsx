import { useLocation } from "react-router";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { LabAuthGuard } from "@/features/lab-portal/components/auth/lab-auth-guard";

export function LabPortalLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LabPortalLayoutFrame>{children}</LabPortalLayoutFrame>
    </AuthProvider>
  );
}

function LabPortalLayoutFrame({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  if (pathname === "/lab-portal/login") {
    return <>{children}</>;
  }

  return <LabAuthGuard>{children}</LabAuthGuard>;
}
