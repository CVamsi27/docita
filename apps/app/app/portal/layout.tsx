import { AuthProvider } from "@workspace/auth";
import { ConsentBanner, PatientAuthGuard, PortalNav } from "@/features/patient-portal/components";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PatientAuthGuard>
        <ConsentBanner />
        <div className="min-h-screen bg-transparent">
          <PortalNav />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </PatientAuthGuard>
    </AuthProvider>
  );
}
