"use client";

import { usePatientPortalAppointments } from "@/hooks/api/use-patient-portal";
import { Card, CardContent } from "@workspace/ui/components/card";

export default function PortalAppointmentsPage() {
  const { data, isLoading } = usePatientPortalAppointments();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">My Appointments</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {data?.appointments.length || 0} appointments found
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
