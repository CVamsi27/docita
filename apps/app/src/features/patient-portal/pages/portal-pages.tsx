import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { PortalOtpLoginUI } from "@/features/patient-portal/components/auth/portal-otp-login-ui";
import { PortalMetricsUI } from "@/features/patient-portal/components/views/portal-metrics-ui";
import PortalDashboardPage from "@/features/patient-portal/components/PortalDashboardPageContent";
import PortalAppointmentsPageContent from "@/features/patient-portal/components/PortalAppointmentsPageContent";
import PatientProfilePage from "@/features/patient-portal/components/PortalProfilePageContent";
import { PortalBillingPageClient } from "@/features/patient-portal/components/PortalBillingPageClient";
import { PortalHistoryPageClient } from "@/features/patient-portal/components/PortalHistoryPageClient";
import { PortalMedicationsPageClient } from "@/features/patient-portal/components/PortalMedicationsPageClient";
import { PortalPrescriptionsPageClient } from "@/features/patient-portal/components/PortalPrescriptionsPageClient";
import { ConsentFormPageClient } from "@/features/patient-portal/components/ConsentFormPageClient";

export function PortalHomePage() {
  return <PortalDashboardPage />;
}

export function PortalLoginPage() {
  return <PortalOtpLoginUI />;
}

export function PortalAppointmentsPage() {
  return <PortalAppointmentsPageContent />;
}

export function PortalBillingPage() {
  return <PortalBillingPageClient />;
}

export function PortalHistoryPage() {
  return <PortalHistoryPageClient />;
}

export function PortalMedicationsPage() {
  return <PortalMedicationsPageClient />;
}

export function PortalMetricsPage() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Metrics"
          description="Track trends and monitor your health metrics over time"
        />
      }
    >
      <PortalMetricsUI showHeader={false} />
    </AppPageScaffold>
  );
}

export function PortalPrescriptionsPage() {
  return <PortalPrescriptionsPageClient />;
}

export function PortalProfilePage() {
  return <PatientProfilePage />;
}

export function PortalConsentFormPage() {
  return <ConsentFormPageClient />;
}
