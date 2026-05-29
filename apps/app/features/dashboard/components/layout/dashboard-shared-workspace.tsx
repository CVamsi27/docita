import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { NowServingBoard } from "@workspace/ui/components/data-display/now-serving-board";

import {
  type DashboardAlertDensity,
  DashboardAlertsContainer,
} from "@/features/dashboard/components/alerts/dashboard-alerts-container";
import { DoctorDashboardCards } from "@/features/dashboard/components/stats/doctor-dashboard-cards";
import type { AppointmentListItem } from "@workspace/data-access";

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

  const tokenNumber = completedToday + inProgressToday;
  const tokenLabel =
    tokenNumber > 0 ? String(tokenNumber).padStart(2, "0") : null;
  const currentPatientName = currentPatient?.patient
    ? `${currentPatient.patient.firstName} ${currentPatient.patient.lastName}`.trim()
    : null;

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

      <div id="dashboard-queue" className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,220px)_1fr] xl:grid-cols-[minmax(0,220px)_1fr_1fr_1fr]">
        <NowServingBoard
          className="lg:col-span-1 xl:col-span-1"
          token={tokenLabel}
          patientName={currentPatientName}
          waiting={waitingCount}
          avgWaitMinutes={
            waitingCount > 0 ? waitingCount * slotDurationMinutes : null
          }
          status={inProgressToday > 0 && currentPatient ? "live" : "idle"}
          footer={
            mode === "today" ? (
              <span className="text-[var(--fs-xs)] text-white/70">
                Today · <strong className="text-white">{totalToday}</strong>
              </span>
            ) : undefined
          }
        />
        <div className="min-w-0 lg:col-span-1 xl:col-span-3">
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
        </div>
      </div>

      {children}
    </div>
  );
}
