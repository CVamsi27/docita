"use client";

import { ClinicProvider } from "@/lib/clinic-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <NavigationHistoryProvider>
        <ClinicProvider>{children}</ClinicProvider>
      </NavigationHistoryProvider>
    </AuthGuard>
  );
}
