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
import { Badge } from "@workspace/ui/components/badge";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Section } from "@workspace/ui/components/section";
import {
  Activity,
  Calendar,
  ClipboardCheck,
  Clock,
  Play,
  Stethoscope,
  Users,
} from "lucide-react";
import { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import { formatTime } from "@/lib/formatters";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import { StatGrid } from "@workspace/ui/components/stat-grid";
import { isQueueTokenInProgress } from "@/lib/queue-token-status";
import { getOpdQueueSummaryLine } from "@/features/consultation/lib/opd-queue-display";
import Link from "next/link";
import { useCheckInAppointment } from "@/hooks/api/use-appointments";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";
import type { Appointment } from "@workspace/types";
import { AddAppointmentDialogContainer } from "@/features/appointments/components/dialogs/AddAppointmentDialogContainer";
import { usePermissions } from "@/hooks/use-permissions";
import { useDoctors } from "@/hooks/api/use-settings";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export const ConsultationDashboardUI: FC = () => {
  const {
    opdQueueRows,
    stats,
    isLoading,
    handleStartConsultation,
    goToConsultationWorkspace,
    canAccessQueue,
    canStartConsultation,
    isStartingConsultation,
    router,
    currentUserRole,
    todayAppointmentsSorted,
    doctorNowNext,
    clinicType,
  } = useConsultationDashboard();

  const checkInAppointment = useCheckInAppointment();
  const { canCreateAppointment } = usePermissions();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const { data: doctors = [] } = useDoctors();

  const role = currentUserRole ?? "RECEPTIONIST";
  const isDoctor = role === "DOCTOR" || role === "ADMIN_DOCTOR";
  const isReception =
    role === "RECEPTIONIST" || role === "ADMIN" || role === "ADMIN_DOCTOR";
  const isNurse = role === "NURSE";
  const canCreateWalkIn = canCreateAppointment && (isReception || isNurse);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    isDoctor ? "me" : "all",
  );

  const resolvedDoctorId =
    selectedDoctorId === "me"
      ? null
      : selectedDoctorId === "all"
        ? null
        : selectedDoctorId;

  const visibleTodayAppointments = useMemo(() => {
    if (!resolvedDoctorId) return todayAppointmentsSorted;
    return todayAppointmentsSorted.filter((a) => a.doctorId === resolvedDoctorId);
  }, [resolvedDoctorId, todayAppointmentsSorted]);

  const visibleQueueRows = useMemo(() => {
    if (!resolvedDoctorId) return opdQueueRows;
    return opdQueueRows.filter((q) => {
      const qDoctorId =
        q.doctorId ?? q.doctor?.id ?? q.appointment?.doctor?.id;
      return qDoctorId === resolvedDoctorId;
    });
  }, [opdQueueRows, resolvedDoctorId]);

  const queueEmpty = visibleQueueRows.length === 0;

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
                        : `${formatTime(row.startTime)} • appointment`;
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
                              {row.visitSummary ? ` • ${row.visitSummary}` : ""}
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

      {isReception ? (
        <Section
          id="consultation-reception-checkin"
          title="Arrivals"
          description="Today’s scheduled patients. Check-in issues the queue token."
        >
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-[var(--fs-md)] font-semibold">
                    Today
                  </CardTitle>
                  <CardDescription>
                    Use “Add walk-in” for unscheduled arrivals.
                  </CardDescription>
                </div>

                <div className="w-full sm:w-[220px]">
                  <Label className="text-xs text-muted-foreground">
                    Doctor
                  </Label>
                  <Select
                    value={selectedDoctorId}
                    onValueChange={setSelectedDoctorId}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All doctors" />
                    </SelectTrigger>
                    <SelectContent>
                      {isDoctor ? (
                        <SelectItem value="me">Me</SelectItem>
                      ) : (
                        <SelectItem value="all">All doctors</SelectItem>
                      )}
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {canCreateWalkIn ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    size="sm"
                    onClick={() => setWalkInOpen(true)}
                    aria-label="Add walk-in and check-in"
                  >
                    Add walk-in
                  </Button>
                </div>
              ) : null}
              {visibleTodayAppointments.length === 0 ? (
                <div className="ui-card-surface flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-6 text-center">
                  <Calendar
                    className="mb-2 h-8 w-8 opacity-50 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="ui-helper-text max-w-md">
                    No appointments for today for this doctor.
                  </p>
                  <p className="mt-3 ui-helper-text max-w-md text-muted-foreground">
                    Use “Add walk-in” or schedule from Appointments.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card/50 divide-y divide-border/60">
                  {visibleTodayAppointments.slice(0, 8).map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between gap-3 p-3 sm:p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {apt.patient?.firstName} {apt.patient?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatTime(apt.startTime)} • {apt.status}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={checkInAppointment.isPending}
                        onClick={async () => {
                          try {
                            await checkInAppointment.mutateAsync(apt.id);
                          } catch (err) {
                            showUserFacingErrorToast(
                              err,
                              "We could not check-in this appointment. Please try again.",
                              "save",
                            );
                          }
                        }}
                      >
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        Check-in
                      </Button>
                    </div>
                  ))}
                </div>
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
          defaultDoctorId={resolvedDoctorId ?? undefined}
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
              {canCreateWalkIn ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setWalkInOpen(true)}
                    aria-label="Add walk-in and check-in"
                  >
                    Add walk-in
                  </Button>
                  <p className="ui-helper-text text-muted-foreground">
                    Schedules an appointment and checks the patient in to the
                    queue.
                  </p>
                </div>
              ) : null}
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
                          {getOpdQueueSummaryLine(q)}
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

      <Section
        id="consultation-opd-queue"
        title="Waiting room queue"
      >
        <Card>
          <CardContent>
            {queueEmpty ? (
              <div className="ui-card-surface flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-8 text-center">
                <Users
                  className="mb-2 h-8 w-8 opacity-50 text-muted-foreground"
                  aria-hidden
                />
                {!canAccessQueue ? (
                  <>
                    <p className="ui-helper-text max-w-md">
                      Queue tokens require the Queue Management capability. You
                      can still run visits from the calendar; check-in issues a
                      token when your plan supports it.
                    </p>
                    <p className="mt-3 ui-helper-text max-w-md text-muted-foreground">
                      Open Today or Appointments to continue visits without a
                      waiting-room token.
                    </p>
                  </>
                ) : (
                  <p className="ui-helper-text max-w-md">
                    No patients waiting and no active consultation on this
                    board. Use check-in on the calendar to add a token, or open
                    an appointment from Today.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="hidden md:block ui-card-surface overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[72px]">Token</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead className="min-w-[200px]">
                          Visit summary
                        </TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="text-right w-[120px]">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleQueueRows.map((item) => {
                        const active = isQueueTokenInProgress(item.status);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold tabular-nums">
                              {item.tokenNumber > 0 ? item.tokenNumber : "—"}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {item.patient?.firstName}{" "}
                                {item.patient?.lastName}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground line-clamp-2">
                                {getOpdQueueSummaryLine(item)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={active ? "default" : "secondary"}
                              >
                                {active ? "Active" : "Waiting"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {canStartConsultation ? (
                                active ? (
                                  <Button
                                    size="sm"
                                    disabled={
                                      isStartingConsultation ||
                                      !item.appointmentId
                                    }
                                    onClick={() =>
                                      item.appointmentId &&
                                      goToConsultationWorkspace(
                                        item.appointmentId,
                                      )
                                    }
                                  >
                                    Continue
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    disabled={
                                      isStartingConsultation ||
                                      !item.appointmentId
                                    }
                                    onClick={() =>
                                      item.appointmentId &&
                                      void handleStartConsultation(
                                        item.appointmentId,
                                      )
                                    }
                                  >
                                    <Play className="mr-1 h-3 w-3" />
                                    Open
                                  </Button>
                                )
                              ) : (
                                <Badge variant="outline">View only</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {visibleQueueRows.map((item) => {
                    const active = isQueueTokenInProgress(item.status);
                    return (
                      <div
                        key={item.id}
                        className={
                          active
                            ? "flex flex-col gap-3 rounded-[var(--radius-lg)] border border-primary/20 bg-primary/5 p-3 sm:p-4"
                            : "flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card p-3 sm:p-4"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {item.tokenNumber > 0 ? (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
                                {item.tokenNumber}
                              </div>
                            ) : (
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarFallback>
                                  {item.patient?.firstName?.[0]}
                                  {item.patient?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {item.patient?.firstName}{" "}
                                {item.patient?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {getOpdQueueSummaryLine(item)}
                              </p>
                              {active && item.consultationStart ? (
                                <div className="mt-1 flex items-center text-xs text-muted-foreground">
                                  <Clock
                                    className="mr-1 h-3 w-3 shrink-0"
                                    aria-hidden
                                  />
                                  Started{" "}
                                  {formatTime(
                                    item.consultationStart,
                                    "en-IN",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </div>
                              ) : !active ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Est. wait {item.estimatedWaitTime ?? 0} min
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <Badge
                            variant={active ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            {active ? "Active" : "Waiting"}
                          </Badge>
                        </div>
                        {canStartConsultation ? (
                          active ? (
                            <Button
                              size="sm"
                              className="w-full sm:w-auto sm:self-end"
                              disabled={
                                isStartingConsultation || !item.appointmentId
                              }
                              onClick={() =>
                                item.appointmentId &&
                                goToConsultationWorkspace(item.appointmentId)
                              }
                            >
                              Continue
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full sm:w-auto sm:self-end"
                              disabled={
                                isStartingConsultation || !item.appointmentId
                              }
                              onClick={() =>
                                item.appointmentId &&
                                void handleStartConsultation(item.appointmentId)
                              }
                            >
                              <Play className="mr-2 h-3 w-3" />
                              Open visit
                            </Button>
                          )
                        ) : (
                          <Badge variant="outline" className="self-start">
                            View only
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Section>
    </AppPageScaffold>
  );
};
