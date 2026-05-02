import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { Section } from "@workspace/ui/components/section";

import {
  type DashboardAlertDensity,
  DashboardAlertsContainer,
} from "@/features/dashboard/components/alerts/dashboard-alerts-container";
import { DoctorDashboardCards } from "@/features/dashboard/components/stats/doctor-dashboard-cards";
import type { AppointmentListItem } from "@/hooks/api/use-appointments";

export type DashboardWorkspaceMode = "dashboard" | "today";

function defaultAlertDensity(mode: DashboardWorkspaceMode): DashboardAlertDensity {
  return mode === "today" ? "urgent-only" : "full";
}

export interface DashboardSharedWorkspaceProps {
  mode: DashboardWorkspaceMode;
  alertDensity?: DashboardAlertDensity;
  todayAppointments: AppointmentListItem[];
  completedToday: number;
  inProgressToday: number;
  currentPatient: AppointmentListItem | null | undefined;
  nextPatients: AppointmentListItem[];
  waitingCount: number;
  pendingJoinRequests: number;
  pendingReports: number;
  slotDurationMinutes: number;
  children?: ReactNode;
  className?: string;
}

export function DashboardSharedWorkspace({
  mode,
  alertDensity,
  todayAppointments,
  completedToday,
  inProgressToday,
  currentPatient,
  nextPatients,
  waitingCount,
  pendingJoinRequests,
  pendingReports,
  slotDurationMinutes,
  children,
  className,
}: DashboardSharedWorkspaceProps) {
  const density = alertDensity ?? defaultAlertDensity(mode);
  const totalToday = todayAppointments.length;
  const queueSummary =
    totalToday > 0
      ? `${totalToday} appointment${totalToday !== 1 ? "s" : ""} on the calendar`
      : "No appointments scheduled for today";

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      <DashboardAlertsContainer
        density={density}
        todayAppointments={totalToday}
        completedAppointments={completedToday}
        pendingReports={pendingReports}
        pendingJoinRequests={pendingJoinRequests}
        patientsWaiting={waitingCount}
        nextPatientName={
          density === "full" && currentPatient?.patient
            ? `${currentPatient.patient.firstName} ${currentPatient.patient.lastName}`
            : undefined
        }
        nextPatientId={density === "full" ? currentPatient?.id : undefined}
      />

      <Section
        id="dashboard-queue"
        title="Today's queue"
        description={queueSummary}
      >
        <DoctorDashboardCards
          currentPatient={currentPatient}
          nextPatients={nextPatients}
          queueStats={{
            waiting: waitingCount,
            inProgress: inProgressToday,
            completed: completedToday,
            total: totalToday,
          }}
          estimatedWaitTime={waitingCount * slotDurationMinutes}
        />
      </Section>

      {children}
    </div>
  );
}
