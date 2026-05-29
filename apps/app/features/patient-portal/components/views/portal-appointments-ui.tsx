"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import type { PatientPortalAppointment } from "@/features/patient-portal/types/patient-portal-types";
import { getAppointmentStatusLabel } from "@/features/patient-portal/rules/patient-portal-rules";
import { formatDateTime } from "@/lib/formatters";

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
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <h1 className="ui-page-title">Appointments</h1>
          <p className="ui-page-subtitle">
            Manage your upcoming and historical appointments.
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No appointments scheduled"
              description="Your next appointment will appear here with date, doctor, and facility details"
            />
          ) : (
            <div className="ui-card-surface overflow-hidden rounded-[var(--radius-md)] border border-border/70 pb-4">
              <ListRowGroup>
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
              </ListRowGroup>
            </div>
          )}
          <div className="flex justify-center pb-4 pt-4">
            <Button asChild variant="outline" className="touch-manipulation">
              <Link href={portalHomeHref}>Back to Portal Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
