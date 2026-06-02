import { getPatientFullName } from "@workspace/utils";
import type { ReactNode } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { NowServingBoard } from "@workspace/ui/components/data-display/now-serving-board";

import {
  type DashboardAlertDensity,
  DashboardAlertsContainer,
} from "@/features/dashboard/components/alerts/dashboard-alerts-container";
import { DoctorDashboardCards } from "@/features/dashboard/components/stats/doctor-dashboard-cards";
import type { AppointmentListItem } from "@workspace/data-access";

export type DashboardWorkspaceMode = "dashboard" | "today";

function defaultAlertDensity(
  mode: DashboardWorkspaceMode,
): DashboardAlertDensity {
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
    ? getPatientFullName(currentPatient.patient).trim()
    : null;
  const progressPercent =
    totalToday > 0
      ? Math.min(Math.max((completedToday / totalToday) * 100, 0), 100)
      : 0;

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
            ? getPatientFullName(currentPatient.patient)
            : undefined
        }
        nextPatientId={density === "full" ? currentPatient?.id : undefined}
      />

      <h2 id="dashboard-queue-heading" className="sr-only">
        Queue
      </h2>
      <div
        id="dashboard-queue"
        className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-stretch"
      >
        <NowServingBoard
          token={tokenLabel}
          patientName={currentPatientName}
          waiting={waitingCount}
          avgWaitMinutes={
            waitingCount > 0 ? waitingCount * slotDurationMinutes : null
          }
          status={inProgressToday > 0 && currentPatient ? "live" : "idle"}
          footer={
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[var(--fs-xs)] text-white/70">
                <span>
                  Active ·{" "}
                  <strong className="text-white tabular-nums">
                    {inProgressToday}
                  </strong>
                </span>
                <span>
                  Done ·{" "}
                  <strong className="text-white tabular-nums">
                    {completedToday}
                  </strong>
                </span>
                <span>
                  Today ·{" "}
                  <strong className="text-white tabular-nums">
                    {totalToday}
                  </strong>
                </span>
              </div>
              {totalToday > 0 ? (
                <div>
                  <div className="mb-1 flex justify-between text-[var(--fs-2xs)] text-white/60">
                    <span>Today&apos;s progress</span>
                    <span className="tabular-nums">
                      {completedToday}/{totalToday}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[var(--brand-cyan)] transition-colors duration-150"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
              <Link
                href="/consultation"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] py-1.5 text-[var(--fs-xs)] font-medium text-white/85 transition-colors duration-150 hover:text-white"
              >
                <Clock className="size-3.5 shrink-0" aria-hidden />
                View full queue
              </Link>
            </div>
          }
        />
        <DoctorDashboardCards
          currentPatient={currentPatient}
          nextPatients={nextPatients}
        />
      </div>

      {children}
    </div>
  );
}
