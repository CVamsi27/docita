// jscpd:ignore-start

import Link from "next/link";
import { getPatientFullName } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
// jscpd:ignore-end
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Section } from "@workspace/ui/components/layout/section";
import {
  StatGrid,
  type StatItem,
} from "@workspace/ui/components/data-display/stat-grid";
import { Activity, Calendar, Play, Stethoscope, Users } from "lucide-react";
import { formatClockTime } from "@/lib/formatters";
import { isQueueTokenInProgress } from "@/lib/utils/queue-token-status";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";
import {
  AppointmentRowActionsMenu,
  useAppointmentRowActions,
} from "@/features/appointments";
import type { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import {
  CONSULTATION_DASHBOARD_DESCRIPTION,
  CONSULTATION_DASHBOARD_TITLE,
} from "./consultation-dashboard-ui-helpers";

type ConsultationDashboardState = ReturnType<typeof useConsultationDashboard>;
type AppointmentRowActions = ReturnType<typeof useAppointmentRowActions>;

interface ConsultationDashboardStatsProps {
  stats: ConsultationDashboardState["stats"];
}

/** Top-of-page stat tiles — split out so `ConsultationDashboardUI` doesn't own the `StatItem[]` literal. */
export function ConsultationDashboardStats({
  stats,
}: ConsultationDashboardStatsProps) {
  const items: StatItem[] = [
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
  ];

  return <StatGrid items={items} columns={4} />;
}

interface ConsultationDashboardHeaderProps {
  router: ConsultationDashboardState["router"];
  canCreateWalkIn: boolean;
  onAddWalkIn: () => void;
}

/** Page header + actions row — split out so the loaded/error states can each render their own header shape. */
export function ConsultationDashboardHeader({
  router,
  canCreateWalkIn,
  onAddWalkIn,
}: ConsultationDashboardHeaderProps) {
  return (
    <PageHeader
      title={CONSULTATION_DASHBOARD_TITLE}
      description={CONSULTATION_DASHBOARD_DESCRIPTION}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href="/today">Today</Link>
          </Button>
          {canCreateWalkIn ? (
            <Button size="sm" onClick={onAddWalkIn}>
              Add walk-in
            </Button>
          ) : null}
          <Button size="sm" onClick={() => router.push("/appointments")}>
            <Calendar className="mr-2 h-4 w-4" />
            Appointments
          </Button>
        </div>
      }
    />
  );
}

interface ConsultationDashboardErrorStateProps {
  onRetry: () => void;
}

/** Error state shell — split out of `ConsultationDashboardUI` so the loaded/error branches are each easy to scan. */
export function ConsultationDashboardErrorState({
  onRetry,
}: ConsultationDashboardErrorStateProps) {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={CONSULTATION_DASHBOARD_TITLE}
          description={CONSULTATION_DASHBOARD_DESCRIPTION}
        />
      }
    >
      <DataState
        status="error"
        className="min-h-[50vh]"
        errorMessage="We could not load your consultation queue. Please try again."
        onRetry={onRetry}
      />
    </AppPageScaffold>
  );
}

interface DoctorNextSectionProps {
  doctorNowNext: ConsultationDashboardState["doctorNowNext"];
  isStartingConsultation: boolean;
  rowActions: AppointmentRowActions;
  handleScheduleFollowUp: (patientId?: string | null) => void;
  handleStartConsultation: (appointmentId: string) => Promise<void> | void;
  goToConsultationWorkspace: (appointmentId: string) => void;
}

export function DoctorNextSection({
  doctorNowNext,
  isStartingConsultation,
  rowActions,
  handleScheduleFollowUp,
  handleStartConsultation,
  goToConsultationWorkspace,
}: DoctorNextSectionProps) {
  return (
    <Section
      id="consultation-doctor-next"
      title={
        doctorNowNext.mode === "fcfs"
          ? "Next patients (First Come First Serve)"
          : "Next patients (schedule + walk-ins)"
      }
      description={
        doctorNowNext.mode === "fcfs"
          ? "No appointments today — seeing patients in arrival order."
          : "Appointments stay in time order. Walk-ins fill the gaps (First Come First Serve)."
      }
    >
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
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card/50 divide-y divide-border/60">
          {doctorNowNext.inProgress.slice(0, 3).map((apt) => {
            const visitSummary =
              apt.chiefComplaint?.trim() || apt.type?.trim() || "—";
            return (
              <div
                key={apt.id}
                data-appointment-id={apt.id}
                className="flex items-center justify-between gap-3 bg-primary/5 p-3 sm:p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {getPatientFullName(apt.patient)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    In progress • {formatClockTime(apt.startTime)}
                    {" • "}
                    {visitSummary}
                    {" • "}
                    {String(apt.status).toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => goToConsultationWorkspace(apt.id)}
                  >
                    Continue
                  </Button>
                  <AppointmentRowActionsMenu
                    appointmentId={apt.id ?? null}
                    patientId={apt.patientId ?? apt.patient?.id ?? null}
                    status={apt.status}
                    onCancelClick={rowActions.onCancelClick}
                    onNoShowClick={rowActions.onNoShowClick}
                    onScheduleFollowUp={() =>
                      handleScheduleFollowUp(apt.patientId ?? apt.patient?.id)
                    }
                  />
                </div>
              </div>
            );
          })}

          {doctorNowNext.combinedUpcoming.slice(0, 10).map((row) => {
            const isQueue = row.kind === "queue";
            const leftMeta = isQueue
              ? `Token ${row.tokenNumber > 0 ? row.tokenNumber : "—"} • ${row.tokenType}`
              : `${formatClockTime(row.startTime)}`;
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
                  <p className="font-medium truncate">{row.patientName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {leftMeta}
                    {" • "}
                    {row.visitSummary ?? "—"}
                    {" • "}
                    {String(row.status).toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                  <AppointmentRowActionsMenu
                    appointmentId={row.appointmentId ?? null}
                    patientId={row.patientId ?? null}
                    status={row.status}
                    onCancelClick={rowActions.onCancelClick}
                    onNoShowClick={rowActions.onNoShowClick}
                    onScheduleFollowUp={() =>
                      handleScheduleFollowUp(row.patientId)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

interface NursePrepSectionProps {
  opdQueueRows: ConsultationDashboardState["opdQueueRows"];
  rowActions: AppointmentRowActions;
  clinicType: ConsultationDashboardState["clinicType"];
  router: ConsultationDashboardState["router"];
  handleScheduleFollowUp: (patientId?: string | null) => void;
}

export function NursePrepSection({
  opdQueueRows,
  rowActions,
  clinicType,
  router,
  handleScheduleFollowUp,
}: NursePrepSectionProps) {
  return (
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
              .map((q) => {
                const queuePatientId = q.patient?.id ?? q.patientId ?? null;
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card p-3 sm:p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {getPatientFullName(q.patient)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Token {q.tokenNumber > 0 ? q.tokenNumber : "—"} •{" "}
                        {String(q.status).toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                      <AppointmentRowActionsMenu
                        appointmentId={q.appointmentId ?? null}
                        patientId={queuePatientId}
                        status={q.status}
                        onCancelClick={rowActions.onCancelClick}
                        onNoShowClick={rowActions.onNoShowClick}
                        onScheduleFollowUp={() =>
                          handleScheduleFollowUp(queuePatientId)
                        }
                      />
                    </div>
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>
    </Section>
  );
}
