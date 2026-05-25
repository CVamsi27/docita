"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
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
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No appointments scheduled"
              description="Your next appointment will appear here with date, doctor, and facility details"
            />
          ) : (
            <div className="space-y-3 pb-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{appointment.doctorName}</div>
                    <Badge variant="secondary">
                      {getAppointmentStatusLabel(appointment.status)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {formatDateTime(appointment.scheduledAt)} •{" "}
                    {appointment.clinicName}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center pb-4">
            <Button asChild variant="outline">
              <Link href={portalHomeHref}>Back to Portal Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
