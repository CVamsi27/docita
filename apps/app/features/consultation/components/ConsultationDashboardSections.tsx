// jscpd:ignore-start

import Link from "next/link";
import { getPatientFullName } from "@workspace/utils";
// jscpd:ignore-end
import { AppPageScaffold, Button, DataState, PageHeader, Section, StatGrid, type StatItem } from "@workspace/ui/components";
import { Activity, BadgeCheck, Calendar, CreditCard, HeartPulse, Play, Stethoscope, Users } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { formatClockTime } from "@/lib/formatters";
import { isQueueTokenInProgress } from "@/lib/utils/queue-token-status";
import { AppointmentRowActionsMenu, useAppointmentRowActions } from "@/features/appointments";
import type { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import { CONSULTATION_DASHBOARD_DESCRIPTION, CONSULTATION_DASHBOARD_TITLE } from "./consultation-dashboard-ui-helpers";

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

interface InvoiceActionButtonProps {
  invoiceStatus?: string | null;
  onClick: () => void;
}

function InvoiceActionButton({ invoiceStatus, onClick }: InvoiceActionButtonProps) {
  if (invoiceStatus === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        <BadgeCheck className="h-3 w-3" />
        Paid
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "h-7 gap-1 px-2.5 text-xs",
        invoiceStatus === "PENDING" && "border-warning/40 text-warning hover:border-warning/60",
        invoiceStatus === "PARTIALLY_PAID" && "border-warning/40 text-warning hover:border-warning/60",
      )}
      onClick={onClick}
    >
      <CreditCard className="h-3 w-3" />
      {invoiceStatus === "PENDING" ? "Invoice ↗" : invoiceStatus === "PARTIALLY_PAID" ? "Partial ↗" : "Invoice"}
    </Button>
  );
}

interface DoctorNextSectionProps {
  doctorNowNext: ConsultationDashboardState["doctorNowNext"];
  isStartingConsultation: boolean;
  rowActions: AppointmentRowActions;
  handleScheduleFollowUp: (patientId?: string | null) => void;
  handleStartConsultation: (appointmentId: string) => Promise<void> | void;
  goToConsultationWorkspace: (appointmentId: string) => void;
  // jscpd:ignore-start
  onVitalsClick: (appointmentId: string, patientName: string) => void;
  onInvoiceClick: (appointmentId: string, patientId: string) => void;
  // jscpd:ignore-end
}

export function DoctorNextSection({
  doctorNowNext,
  isStartingConsultation,
  rowActions,
  handleScheduleFollowUp,
  handleStartConsultation,
  goToConsultationWorkspace,
  onVitalsClick,
  onInvoiceClick,
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
            const patientName = getPatientFullName(apt.patient);
            const visitSummary =
              apt.chiefComplaint?.trim() || apt.type?.trim() || "—";
            const aptPatientId = apt.patientId ?? apt.patient?.id;
            return (
              <div
                key={apt.id}
                data-appointment-id={apt.id}
                className="flex items-center justify-between gap-3 bg-primary/5 p-3 sm:p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{patientName}</p>
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
                    variant="outline"
                    className="h-7 gap-1 px-2.5 text-xs"
                    onClick={() => onVitalsClick(apt.id, patientName)}
                  >
                    <HeartPulse className="h-3 w-3 text-destructive" />
                    Vitals
                  </Button>
                  <InvoiceActionButton
                    invoiceStatus={apt.invoice?.status}
                    onClick={() => {
                      if (aptPatientId) onInvoiceClick(apt.id, aptPatientId);
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => goToConsultationWorkspace(apt.id)}
                  >
                    Continue
                  </Button>
                  <AppointmentRowActionsMenu
                    appointmentId={apt.id ?? null}
                    patientId={aptPatientId ?? null}
                    status={apt.status}
                    onCancelClick={rowActions.onCancelClick}
                    onNoShowClick={rowActions.onNoShowClick}
                    onScheduleFollowUp={() =>
                      handleScheduleFollowUp(aptPatientId)
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
            const appointmentId = row.appointmentId ?? null;
            const patientId = row.patientId ?? null;
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
                  {appointmentId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2.5 text-xs"
                      onClick={() => onVitalsClick(appointmentId, row.patientName)}
                    >
                      <HeartPulse className="h-3 w-3 text-destructive" />
                      Vitals
                    </Button>
                  ) : null}
                  {appointmentId && patientId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2.5 text-xs"
                      onClick={() => onInvoiceClick(appointmentId, patientId)}
                    >
                      <CreditCard className="h-3 w-3 text-success" />
                      Invoice
                    </Button>
                  ) : null}
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
                    <Play className="mr-1.5 h-3 w-3" />
                    Start
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

export { NursePrepSection } from "./ConsultationDashboardNursePrep";
export type { NursePrepSectionProps } from "./ConsultationDashboardNursePrep";
