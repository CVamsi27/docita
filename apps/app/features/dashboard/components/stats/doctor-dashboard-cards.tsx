"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/formatters";
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardHeader, CardTitle, ListRow, ListRowGroup } from "@workspace/ui/components";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { Play, Stethoscope } from "lucide-react";

import type { AppointmentListItem } from "@workspace/data-access";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { getInitials } from "@/lib/formatters";
import { getPatientFullName } from "@workspace/utils";

interface DoctorDashboardCardsProps {
  currentPatient?: AppointmentListItem | null;
  nextPatients: AppointmentListItem[];
}

export function DoctorDashboardCardsUI({
  currentPatient,
  nextPatients,
}: DoctorDashboardCardsProps) {
  const router = useRouter();
  const startConsultation = useStartConsultation();
  const [startingAppointmentId, setStartingAppointmentId] = useState<
    string | null
  >(null);

  const handleStartAppointment = async (appointmentId: string) => {
    try {
      setStartingAppointmentId(appointmentId);
      const result = await startConsultation.mutateAsync({ appointmentId });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not open this consultation. Please try again.",
        "save",
      );
    } finally {
      setStartingAppointmentId(null);
    }
  };

  return (
    <div className="min-w-0">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold">
                  {currentPatient ? "Current Patient" : "No Active Session"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {currentPatient
                    ? "In consultation"
                    : "Start your next patient"}
                </p>
              </div>
            </div>
            {currentPatient && (
              <Badge className="badge-info w-fit border px-2.5 py-0.5 font-medium">
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentPatient ? (
            <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3 sm:flex-row sm:items-center sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-14 sm:w-14 shrink-0">
                <AvatarFallback className="border border-border/70 bg-background/70 text-foreground text-base sm:text-lg font-medium">
                  {getInitials(
                    currentPatient.patient?.firstName ?? "",
                    currentPatient.patient?.lastName,
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-base sm:text-xl font-semibold truncate">
                  {getPatientFullName(currentPatient.patient)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  {humanizeUiLabel(currentPatient.type)} •{" "}
                  {formatTime(currentPatient.startTime, "h:mm a")}
                </p>
              </div>
              <Button
                size="default"
                className="w-full gap-2 sm:w-auto sm:shrink-0"
                onClick={() =>
                  router.push(`/consultation/${currentPatient.id}`)
                }
              >
                <Play className="h-4 w-4" />
                Continue
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                {nextPatients.length > 0
                  ? `${nextPatients.length} patient(s) waiting`
                  : "No patients in queue"}
              </p>
              {nextPatients.length > 0 && nextPatients[0] && (
                <Button
                  size="default"
                  className="w-full gap-2 sm:w-auto sm:shrink-0"
                  disabled={startConsultation.isPending}
                  onClick={() =>
                    void handleStartAppointment(nextPatients[0].id)
                  }
                >
                  <Play className="h-4 w-4" />
                  {startingAppointmentId === nextPatients[0].id
                    ? "Starting…"
                    : "Start Next Patient"}
                </Button>
              )}
            </div>
          )}

          {nextPatients.length > 0 ? (
            <ListRowGroup className="mt-4">
              {nextPatients.slice(0, 5).map((appt, index) => {
                const name = appt.patient
                  ? getPatientFullName(appt.patient).trim()
                  : "Patient";
                return (
                  <ListRow
                    key={appt.id}
                    token={String(index + 1).padStart(2, "0")}
                    title={name}
                    meta={humanizeUiLabel(appt.type)}
                    time={formatTime(appt.startTime, "h:mm a")}
                    status="waiting"
                    statusLabel="Waiting"
                    onClick={() => void handleStartAppointment(appt.id)}
                  />
                );
              })}
            </ListRowGroup>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export { DoctorDashboardCardsUI as DoctorDashboardCards };
