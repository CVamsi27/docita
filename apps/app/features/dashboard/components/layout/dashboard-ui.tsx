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
import { ErrorState } from "@workspace/ui/components/error-state";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { LayoutDashboard } from "lucide-react";

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
  slotDurationMinutes = 15,
  isLoading,
  isError,
  onRetry,
  canAccess,
}: DashboardUIProps) {
  if (isLoading) {
    return <DashboardSkeletonUI />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <ErrorState
          message="Failed to load dashboard. Please try again."
          onRetry={onRetry}
        />
      </div>
    );
  }

  const isNewClinic =
    stats.totalPatients === 0 &&
    stats.todayAppointments === 0 &&
    stats.activePrescriptions === 0;

  if (isNewClinic) {
    return (
      <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <DashboardHeaderContainer />
          <div className="flex items-center justify-center h-[50vh]">
            <EmptyState
              icon={LayoutDashboard}
              title="Welcome to Docita"
              description="Your dashboard will come to life once you start adding patients and scheduling appointments."
              action={{ label: "Add your first patient", href: "/patients" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <DashboardHeaderContainer />

        {}
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

        {}
        <div
          className={cn(
            "grid gap-4 sm:gap-6",
            canAccess(Feature.CALENDAR_SLOTS)
              ? "lg:grid-cols-3"
              : "lg:grid-cols-1",
          )}
        >
          {}
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <TodayScheduleUI appointments={todayAppointments} />
          )}

          {}
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
    </div>
  );
}
