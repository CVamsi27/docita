import { AuthProvider } from "@workspace/auth";
import { PatientAuthGuard, PortalNav, ConsentBanner } from "@/features/patient-portal/components";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PatientAuthGuard>
        <ConsentBanner />
        <div className="min-h-screen bg-gray-50">
          <PortalNav />
          <main className="container mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </PatientAuthGuard>
    </AuthProvider>
  );
}
