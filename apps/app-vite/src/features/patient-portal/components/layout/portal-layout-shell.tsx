"use client";

import { useLocation } from "react-router";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ConsentBanner } from "@/features/patient-portal/components/navigation/consent-banner";
import { PatientAuthGuard } from "@/features/patient-portal/components/auth/patient-auth-guard";
import { PortalNav } from "@/features/patient-portal/components/navigation/portal-nav";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";

export function PortalLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalLayoutFrame>{children}</PortalLayoutFrame>
    </AuthProvider>
  );
}

function PortalLayoutFrame({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

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
        <footer className="mx-auto flex w-full max-w-7xl items-center justify-center gap-1.5 border-t border-border/50 px-4 py-4 text-[length:var(--fs-2xs)] text-muted-foreground md:px-6 lg:px-8">
          <span>Powered by</span>
          <a
            href="https://docita.work"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors duration-150 hover:text-foreground"
          >
            <DocitaLogo
              showText={false}
              className="h-4 w-4"
              iconClassName="h-4 w-4"
            />
            <span>Docita</span>
          </a>
        </footer>
      </div>
    </PatientAuthGuard>
  );
}
