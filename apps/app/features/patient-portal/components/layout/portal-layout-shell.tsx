"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ConsentBanner } from "@/features/patient-portal/components/navigation/consent-banner";
import { PatientAuthGuard } from "@/features/patient-portal/components/auth/patient-auth-guard";
import { PortalNav } from "@/features/patient-portal/components/navigation/portal-nav";

export function PortalLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalLayoutFrame>{children}</PortalLayoutFrame>
    </AuthProvider>
  );
}

function PortalLayoutFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  return (
    <PatientAuthGuard>
      <ConsentBanner />
      <div className="min-h-screen bg-transparent">
        <PortalNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </PatientAuthGuard>
  );
}
