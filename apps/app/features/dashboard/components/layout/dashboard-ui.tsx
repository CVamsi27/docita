import { cn } from "@workspace/ui/lib/utils";
import { Feature } from "@/lib/stores/permission-store";
import {
  DailyProgressUI,
  DashboardHeaderContainer,
  DashboardQuickActionsContainer,
  DashboardSkeletonUI,
  DashboardStatsGrid,
  DoctorDashboardCards,
  RecentPatientsUI,
  TodayScheduleUI,
} from "@/features/dashboard/components";
import { DashboardAppointment, DashboardPatient } from "@workspace/types";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-state";
import { LayoutDashboard } from "lucide-react";
import { DashboardAlertsContainer } from "@/features/dashboard/components/alerts/dashboard-alerts-container";

interface DashboardUIProps {
  stats: {
    totalPatients: number;
    todayAppointments: number;
    activePrescriptions: number;
    pendingReports: number;
    newPatientsThisMonth: number;
  };
  recentPatients: DashboardPatient[];
  todayAppointments: DashboardAppointment[];
  completedToday: number;
  inProgressToday: number;
  currentPatient: DashboardAppointment | null | undefined;
  nextPatients: DashboardAppointment[];
  waitingCount: number;
  pendingJoinRequests: number;
  slotDurationMinutes?: number;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  canAccess: (feature: Feature) => boolean;
}

export function DashboardUI({
  stats,
  recentPatients,
  todayAppointments,
  completedToday,
  inProgressToday,
  currentPatient,
  nextPatients,
  waitingCount,
  pendingJoinRequests,
  slotDurationMinutes = 15,
  isLoading,
  isError,
  onRetry,
  canAccess,
}: DashboardUIProps) {
  const header = <DashboardHeaderContainer />;

  if (isLoading) {
    return (
      <AppPageScaffold header={header}>
        <DashboardSkeletonUI />
      </AppPageScaffold>
    );
  }

  if (isError) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage="We could not load the dashboard. Please try again."
          onRetry={onRetry}
        />
      </AppPageScaffold>
    );
  }

  const isNewClinic =
    stats.totalPatients === 0 &&
    stats.todayAppointments === 0 &&
    stats.activePrescriptions === 0;

  const alerts = (
    <DashboardAlertsContainer
      todayAppointments={todayAppointments.length}
      completedAppointments={completedToday}
      pendingReports={stats.pendingReports}
      pendingJoinRequests={pendingJoinRequests}
      patientsWaiting={waitingCount}
      nextPatientName={
        currentPatient?.patient
          ? `${currentPatient.patient.firstName} ${currentPatient.patient.lastName}`
          : undefined
      }
      nextPatientId={currentPatient?.id}
      className="mb-4"
    />
  );

  if (isNewClinic) {
    return (
      <AppPageScaffold header={header}>
        <div className="space-y-4">
          {alerts}
          <DataState
            status="empty"
            className="min-h-[50vh]"
            emptyIcon={LayoutDashboard}
            emptyTitle="Welcome to Docita"
            emptyDescription="Your dashboard will come to life once you start adding patients and scheduling appointments."
            emptyAction={{ label: "Add your first patient", href: "/patients" }}
          />
        </div>
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold header={header}>
      <div className="space-y-4 sm:space-y-6">
        {alerts}

        <DoctorDashboardCards
          currentPatient={currentPatient}
          nextPatients={nextPatients}
          queueStats={{
            waiting: waitingCount,
            inProgress: inProgressToday,
            completed: completedToday,
            total: todayAppointments.length,
          }}
          estimatedWaitTime={waitingCount * slotDurationMinutes}
        />

        <DashboardQuickActionsContainer pendingReports={stats.pendingReports} />

        <DashboardStatsGrid
          stats={stats}
          completedToday={completedToday}
          inProgressToday={inProgressToday}
        />

        <div
          className={cn(
            "grid gap-4 sm:gap-6",
            canAccess(Feature.CALENDAR_SLOTS)
              ? "lg:grid-cols-3"
              : "lg:grid-cols-1",
          )}
        >
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <TodayScheduleUI appointments={todayAppointments} />
          )}

          <div className="space-y-4 sm:space-y-6">
            <RecentPatientsUI patients={recentPatients} />

            <DailyProgressUI
              completedToday={completedToday}
              totalAppointments={todayAppointments.length}
              pendingReports={stats.pendingReports}
            />
          </div>
        </div>
      </div>
    </AppPageScaffold>
  );
}
