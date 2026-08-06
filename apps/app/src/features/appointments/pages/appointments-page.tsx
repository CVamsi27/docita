import { useAppointmentNotifications } from "../hooks/use-appointment-notifications";
import { PageMeta } from "@/components/layout/page-meta";
import AppointmentsPageContent from "../components/AppointmentsPageContent";

export function AppointmentsPage() {
  useAppointmentNotifications();

  return (
    <>
      <PageMeta title="Appointments" description="Manage clinic appointments" />
      <AppointmentsPageContent />
    </>
  );
}
