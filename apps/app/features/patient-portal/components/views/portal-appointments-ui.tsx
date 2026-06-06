"use client";

import { CalendarDays } from "lucide-react";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import type { PatientPortalAppointment } from "@/features/patient-portal/types/patient-portal-types";
import { getAppointmentStatusLabel } from "@/features/patient-portal/rules/patient-portal-rules";
import { formatDateTime } from "@/lib/formatters";
import { PortalCardSection } from "./portal-card-section";

interface PatientPortalAppointmentsUIProps {
  appointments: PatientPortalAppointment[];
  portalHomeHref: string;
  showHeader?: boolean;
}

export function PatientPortalAppointmentsUI({
  appointments,
  portalHomeHref,
  showHeader = true,
}: PatientPortalAppointmentsUIProps) {
  return (
    <PortalCardSection
      pageTitle="Appointments"
      pageSubtitle="Manage your upcoming and historical appointments."
      cardTitle="Upcoming appointments"
      emptyIcon={CalendarDays}
      emptyTitle="No appointments scheduled"
      emptyDescription="Your next appointment will appear here with date, doctor, and facility details"
      isEmpty={appointments.length === 0}
      portalHomeHref={portalHomeHref}
      showHeader={showHeader}
    >
      {appointments.map((appointment) => (
        <ListRow
          key={appointment.id}
          title={appointment.doctorName}
          meta={appointment.clinicName}
          time={formatDateTime(appointment.scheduledAt)}
          status={appointment.status}
          statusLabel={getAppointmentStatusLabel(appointment.status)}
          showChevron={false}
        />
      ))}
    </PortalCardSection>
  );
}
