import { useNavigate } from "react-router";
import { Button, DataState, PageHeader, Section, StatGrid } from "@workspace/ui/components";
import { CONSULTATION_DASHBOARD_TITLE, CONSULTATION_DASHBOARD_DESCRIPTION } from "./consultation-dashboard-ui-helpers";
import { BadgeCheck, Activity, Calendar, CreditCard, HeartPulse, Play, Stethoscope, Users } from "lucide-react";
import { formatClockTime } from "@/lib/formatters";
import { AppointmentRowActionsMenu } from "@/features/appointments/components/forms/AppointmentRowActionsMenu";
import type { useAppointmentRowActions } from "@/features/appointments/hooks/use-appointment-row-actions";
import type { useConsultationDashboard } from "../hooks/use-consultation-dashboard";

type Dashboard = ReturnType<typeof useConsultationDashboard>;
type AppointmentRowActions = ReturnType<typeof useAppointmentRowActions>;

/* -------------------------------------------------------------------------- */
/*  Stats Grid                                                                */
/* -------------------------------------------------------------------------- */
interface StatsProps { stats: Dashboard["stats"]; }
export function ConsultationDashboardStats({ stats }: StatsProps) {
  return (
    <StatGrid
      items={[
        { id: "scheduled", label: "Scheduled Today", value: stats.scheduledToday, icon: <Calendar className="h-4 w-4" /> },
        { id: "waiting", label: "Waiting", value: stats.waiting, icon: <Users className="h-4 w-4" /> },
        { id: "active", label: "Active", value: stats.inProgress, icon: <Activity className="h-4 w-4" /> },
        { id: "completed", label: "Completed", value: stats.completed, icon: <Stethoscope className="h-4 w-4" /> },
      ]}
      columns={4}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */
interface HeaderProps {
  canCreateWalkIn: boolean;
  onAddWalkIn: () => void;
}
export function ConsultationDashboardHeader({ canCreateWalkIn, onAddWalkIn }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <PageHeader
      title={CONSULTATION_DASHBOARD_TITLE}
      description={CONSULTATION_DASHBOARD_DESCRIPTION}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/today")}>
            <Calendar className="mr-2 h-4 w-4" />
            Today
          </Button>
          {canCreateWalkIn && (
            <Button size="sm" onClick={onAddWalkIn}>Add walk-in</Button>
          )}
          <Button size="sm" onClick={() => navigate("/appointments")}>
            <Calendar className="mr-2 h-4 w-4" />
            Appointments
          </Button>
        </div>
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Error State                                                               */
/* -------------------------------------------------------------------------- */
interface ErrorStateProps { onRetry: () => void; }
export function ConsultationDashboardErrorState({ onRetry }: ErrorStateProps) {
  return (
    <DataState
      status="error"
      className="min-h-[50vh]"
      errorMessage="We could not load your consultation queue. Please try again."
      onRetry={onRetry}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */
export function ConsultationDashboardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 rounded bg-muted-foreground/10" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted-foreground/10" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-muted-foreground/10" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Invoice Action Button                                                     */
/* -------------------------------------------------------------------------- */
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
      className={`h-7 gap-1 px-2.5 text-xs ${
        invoiceStatus === "PENDING" || invoiceStatus === "PARTIALLY_PAID"
          ? "border-warning/40 text-warning hover:border-warning/60"
          : ""
      }`}
      onClick={onClick}
    >
      <CreditCard className="h-3 w-3" />
      {invoiceStatus === "PENDING" ? "Invoice ↗" : invoiceStatus === "PARTIALLY_PAID" ? "Partial ↗" : "Invoice"}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Doctor Next Section — with vitals, invoice, kebab menu                    */
/* -------------------------------------------------------------------------- */
interface DoctorNextSectionProps {
  doctorNowNext: Dashboard["doctorNowNext"];
  isStartingConsultation: boolean;
  rowActions: AppointmentRowActions;
  handleScheduleFollowUp: (patientId?: string | null) => void;
  handleStartConsultation: (appointmentId: string) => Promise<void> | void;
  goToConsultationWorkspace: (appointmentId: string) => void;
  onVitalsClick: (appointmentId: string, patientName: string) => void;
  onInvoiceClick: (appointmentId: string, patientId: string) => void;
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
  const hasItems = doctorNowNext.inProgress.length > 0 || doctorNowNext.combinedUpcoming.length > 0;

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
          : "Appointments stay in time order. Walk-ins fill the gaps."
      }
    >
      {!hasItems ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-6 text-center rounded-lg">
          <Stethoscope className="mb-2 h-8 w-8 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No patients in the schedule or queue right now.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask reception to check-in a walk-in, or book an appointment.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card/50 overflow-hidden">
          {/* In Progress — highlighted rows */}
          {doctorNowNext.inProgress.slice(0, 3).map((apt) => {
            const aptPatientId = apt.patientId ?? apt.patient?.id;
            return (
              <div
                key={apt.id}
                data-appointment-id={apt.id}
                className="flex items-center justify-between gap-3 bg-primary/5 p-3 sm:p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{apt.patientName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    In progress • {apt.visitSummary ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2.5 text-xs"
                    onClick={() => onVitalsClick(apt.appointmentId ?? apt.id, apt.patientName)}
                  >
                    <HeartPulse className="h-3 w-3 text-destructive" />
                    Vitals
                  </Button>
                  <InvoiceActionButton
                    invoiceStatus={apt.invoice?.status}
                    onClick={() => {
                      if (aptPatientId) onInvoiceClick(apt.appointmentId ?? apt.id, aptPatientId);
                    }}
                  />
                  <Button size="sm" onClick={() => goToConsultationWorkspace(apt.appointmentId ?? apt.id)}>
                    Continue
                  </Button>
                  <AppointmentRowActionsMenu
                    appointmentId={apt.appointmentId ?? apt.id ?? null}
                    patientId={aptPatientId ?? null}
                    status={apt.status}
                    onCancelClick={rowActions.onCancelClick}
                    onNoShowClick={rowActions.onNoShowClick}
                    onScheduleFollowUp={() => handleScheduleFollowUp(aptPatientId)}
                  />
                </div>
              </div>
            );
          })}

          {/* Upcoming rows */}
          {doctorNowNext.combinedUpcoming.slice(0, 10).map((row) => {
            const isQueue = row.kind === "queue";
            const leftMeta = isQueue
              ? `Token ${row.tokenNumber ?? "—"}${row.tokenType ? ` • ${row.tokenType}` : ""}`
              : row.startTime ? formatClockTime(row.startTime) : "—";
            const canOpen = Boolean(row.appointmentId);
            const appointmentId = row.appointmentId ?? null;
            const patientId = row.patientId ?? null;
            return (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 p-3 sm:p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{row.patientName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {leftMeta}
                    {" • "}
                    {row.visitSummary ?? "—"}
                    {" • "}
                    <span className="capitalize">{row.status?.toLowerCase()}</span>
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
                    onScheduleFollowUp={() => handleScheduleFollowUp(row.patientId)}
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


