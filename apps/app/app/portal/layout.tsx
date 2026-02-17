import { PatientAuthGuard } from '@/features/patient-portal/components/PatientAuthGuard';
import { PortalNav } from '@/features/patient-portal/components/PortalNav';
import { ConsentBanner } from '@/features/patient-portal/components/ConsentBanner';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientAuthGuard>
      <ConsentBanner />
      <div className="min-h-screen bg-gray-50">
        <PortalNav />
        <main className="container mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </PatientAuthGuard>
  );
}
