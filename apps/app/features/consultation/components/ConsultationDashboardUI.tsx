"use client";

import { FC, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Section } from "@workspace/ui/components/section";
import { Activity, Calendar, Play, Stethoscope, Users } from "lucide-react";
import { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import { formatTime } from "@/lib/formatters";
import { StatGrid } from "@workspace/ui/components/stat-grid";
import { isQueueTokenInProgress } from "@/lib/queue-token-status";
import Link from "next/link";
import { useCheckInAppointment } from "@/hooks/api/use-appointments";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";
import type { Appointment } from "@workspace/types";
import { AddAppointmentDialogContainer } from "@/features/appointments/components/dialogs/AddAppointmentDialogContainer";
import { usePermissions } from "@/hooks/use-permissions";

export const ConsultationDashboardUI: FC = () => {
  const {
    opdQueueRows,
    stats,
    isLoading,
    handleStartConsultation,
    goToConsultationWorkspace,
    isStartingConsultation,
    router,
    currentUserRole,
    doctorNowNext,
    clinicType,
  } = useConsultationDashboard();

  const checkInAppointment = useCheckInAppointment();
  const { canCreateAppointment } = usePermissions();
  const [walkInOpen, setWalkInOpen] = useState(false);

  const role = currentUserRole ?? "RECEPTIONIST";
  const isDoctor = role === "DOCTOR" || role === "ADMIN_DOCTOR";
  const isReception =
    role === "RECEPTIONIST" || role === "ADMIN" || role === "ADMIN_DOCTOR";
  const isNurse = role === "NURSE";
  const canCreateWalkIn = canCreateAppointment && (isReception || isNurse);

  const statItems = useMemo(
    () => [
      {
        id: "scheduled",
        label: "Scheduled Today",
        value: stats.scheduledToday,
        icon: <Calendar className="h-4 w-4" aria-hidden />,
      },
      {
        id: "waiting",
        label: "Waiting",
        value: stats.waiting,
        icon: <Users className="h-4 w-4" aria-hidden />,
      },
      {
        id: "active",
        label: "Active",
        value: stats.inProgress,
        icon: <Activity className="h-4 w-4" aria-hidden />,
      },
      {
        id: "completed",
        label: "Completed",
        value: stats.completed,
        icon: <Stethoscope className="h-4 w-4" aria-hidden />,
      },
    ],
    [stats],
  );

  if (isLoading) {
    return (
      <AppPageScaffold
        header={
          <PageHeader
            title="Consultation"
            description="OPD queue and visits in progress for today — one board for the floor."
          />
        }
      >
        <StatGrid items={[]} columns={4} isLoading />

        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-6 w-40 max-w-full" />
            <Skeleton className="mt-2 h-4 w-full max-w-xl" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/50 p-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full max-w-md" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Consultation"
          description="Two views: your schedule (time-based) and the waiting-room queue (token-based)."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild size="sm">
                <Link href="/today">Today</Link>
              </Button>
              {canCreateWalkIn ? (
                <Button size="sm" onClick={() => setWalkInOpen(true)}>
                  Add walk-in
                </Button>
              ) : null}
              <Button onClick={() => router.push("/appointments")}>
                <Calendar className="mr-2 h-4 w-4" />
                Appointments
              </Button>
            </div>
          }
        />
      }
    >
      <StatGrid items={statItems} columns={4} />

      {isDoctor ? (
        <Section
          id="consultation-doctor-next"
          title={
            doctorNowNext.mode === "fcfs"
              ? "Next patients (FCFS)"
              : "Next patients (schedule + walk-ins)"
          }
          description={
            doctorNowNext.mode === "fcfs"
              ? "No appointments today — seeing patients in arrival order."
              : "Appointments stay in time order. Walk-ins fill the gaps (FCFS)."
          }
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--fs-md)] font-semibold">
                Next up
              </CardTitle>
              <CardDescription>
                Continue your current visit, or open the next patient in this
                combined list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {doctorNowNext.inProgress.length === 0 &&
              doctorNowNext.combinedUpcoming.length === 0 ? (
                <div className="ui-card-surface flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-6 text-center">
                  <Stethoscope
                    className="mb-2 h-8 w-8 opacity-50 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="ui-helper-text max-w-md">
                    No patients in the schedule or queue right now.
                  </p>
                  <p className="mt-3 ui-helper-text max-w-md text-muted-foreground">
                    Ask reception to check-in a walk-in, or book an appointment.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card/50 divide-y divide-border/60">
                    {doctorNowNext.inProgress.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between gap-3 bg-primary/5 p-3 sm:p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {apt.patient?.firstName} {apt.patient?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            In progress • {formatTime(apt.startTime)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => goToConsultationWorkspace(apt.id)}
                        >
                          Continue
                        </Button>
                      </div>
                    ))}

                    {doctorNowNext.combinedUpcoming.slice(0, 10).map((row) => {
                      const isQueue = row.kind === "queue";
                      const leftMeta = isQueue
                        ? `Token ${row.tokenNumber > 0 ? row.tokenNumber : "—"} • ${row.tokenType}`
                        : `${formatTime(row.startTime)}`;
                      const canOpen = Boolean(row.appointmentId);
                      return (
                        <div
                          key={
                            isQueue
                              ? `q-${row.createdAt}-${row.tokenNumber}-${row.patientName}`
                              : `a-${row.appointmentId}`
                          }
                          className="flex items-center justify-between gap-3 p-3 sm:p-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {row.patientName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {leftMeta}
                              {" • "}
                              {row.visitSummary ?? "—"}
                              {" • "}
                              {String(row.status).toLowerCase()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={isStartingConsultation || !canOpen}
                            onClick={() => {
                              if (!row.appointmentId) return;
                              if (isQueue && isQueueTokenInProgress(row.status)) {
                                goToConsultationWorkspace(row.appointmentId);
                                return;
                              }
                              void handleStartConsultation(row.appointmentId);
                            }}
                          >
                            <Play className="mr-2 h-3 w-3" />
                            Open
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Section>
      ) : null}



      {canCreateWalkIn ? (
        <AddAppointmentDialogContainer
          open={walkInOpen}
          onOpenChange={setWalkInOpen}
          selectedDate={new Date()}
          mode="walk-in"
          onAppointmentAdded={async (appointment: Appointment) => {
            try {
              if (!appointment.id) {
                showUserFacingErrorToast(
                  "Missing appointment id.",
                  "Appointment created, but we could not check-in the patient. Please refresh and try again from Appointments.",
                  "save",
                );
                return;
              }
              await checkInAppointment.mutateAsync(appointment.id);
            } catch (err) {
              showUserFacingErrorToast(
                err,
                "Appointment created, but we could not check-in the patient. You can check them in from Appointments.",
                "save",
              );
            }
          }}
        />
      ) : null}

      {isNurse ? (
        <Section
          id="consultation-nurse-prep"
          title="Prep"
          description="Open waiting patients directly into the vitals/exam section."
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--fs-md)] font-semibold">
                Ready for vitals
              </CardTitle>
              <CardDescription>
                Use the queue list to capture vitals and prep before the doctor
                starts charting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {opdQueueRows.length === 0 ? (
                <div className="ui-card-surface flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-6 text-center">
                  <Users
                    className="mb-2 h-8 w-8 opacity-50 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="ui-helper-text max-w-md">
                    No patients are in the queue right now.
                  </p>
                </div>
              ) : (
                opdQueueRows
                  .filter((q) => Boolean(q.appointmentId))
                  .slice(0, 10)
                  .map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card p-3 sm:p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {q.patient?.firstName} {q.patient?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Token {q.tokenNumber > 0 ? q.tokenNumber : "—"} •{" "}
                          {String(q.status).toLowerCase()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!q.appointmentId) return;
                          router.push(
                            buildConsultationRoute(q.appointmentId, {
                              tab: "vitals",
                              clinicType,
                            }),
                          );
                        }}
                      >
                        Record vitals
                      </Button>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </Section>
      ) : null}


    </AppPageScaffold>
  );
};
