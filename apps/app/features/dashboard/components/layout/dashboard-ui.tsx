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
  isLoading: boolean;
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
  isLoading,
  canAccess,
}: DashboardUIProps) {
  if (isLoading) {
    return <DashboardSkeletonUI />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <DashboardHeaderContainer />

        {/* Doctor-Centric Dashboard Cards */}
        <DoctorDashboardCards
          currentPatient={currentPatient}
          nextPatients={nextPatients}
          queueStats={{
            waiting: waitingCount,
            inProgress: inProgressToday,
            completed: completedToday,
            total: todayAppointments.length,
          }}
          estimatedWaitTime={waitingCount * 15} // Assume 15 min per patient
        />

        <DashboardQuickActionsContainer pendingReports={stats.pendingReports} />

        <DashboardStatsGrid
          stats={stats}
          completedToday={completedToday}
          inProgressToday={inProgressToday}
        />

        {/* Main Content */}
        <div
          className={cn(
            "grid gap-4 sm:gap-6",
            canAccess(Feature.CALENDAR_SLOTS)
              ? "lg:grid-cols-3"
              : "lg:grid-cols-1",
          )}
        >
          {/* Schedule Section */}
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <TodayScheduleUI appointments={todayAppointments} />
          )}

          {/* Right Column */}
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
