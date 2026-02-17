"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { EmptyState } from "@workspace/ui/components/empty-state";
import type { PatientPortalAppointment } from "../types/patient-portal-types";
import { getAppointmentStatusLabel } from "../rules/patient-portal-rules";

interface PatientPortalAppointmentsUIProps {
  appointments: PatientPortalAppointment[];
  portalHomeHref: string;
}

export function PatientPortalAppointmentsUI({
  appointments,
  portalHomeHref,
}: PatientPortalAppointmentsUIProps) {
  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Manage your upcoming and historical appointments.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No appointments scheduled"
              description="Your next appointment will appear here with date, doctor, and clinic details."
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
                    {new Date(appointment.scheduledAt).toLocaleString()} • {appointment.clinicName}
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
