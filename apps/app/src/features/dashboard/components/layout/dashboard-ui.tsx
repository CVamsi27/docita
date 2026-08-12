import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@workspace/ui/lib/utils";
import { Feature } from "@/lib/stores/permission-store";
import { DashboardStatsGrid } from "@/features/dashboard/components/stats/dashboard-stats-grid";
import { RecentPatientsUI } from "@/features/dashboard/components/patients/recent-patients-ui";
import { TodayScheduleUI } from "@/features/dashboard/components/schedule/today-schedule-ui";
import { DailyProgressUI } from "@/features/dashboard/components/progress/daily-progress-ui";
import { DashboardActivityFeed } from "@/features/dashboard/components/overview/dashboard-activity-feed";
import { DashboardUpcomingCard } from "@/features/dashboard/components/overview/dashboard-upcoming-card";
import type { AppointmentListItem } from "@workspace/data-access";
import type { DashboardPatient, DashboardStats } from "@workspace/types";
import { AppPageScaffold, DataState, Section } from "@workspace/ui/components";
import { LayoutDashboard } from "lucide-react";
import { DEFAULT_SLOT_DURATION } from "@workspace/utils";
import { formatDashboardSummary } from "@/features/dashboard/lib/format-dashboard-summary";
import { isNewClinicDashboard } from "@/features/dashboard/lib/is-new-clinic-dashboard";
import { DashboardHeaderContainer } from "./dashboard-header-container";
import { DashboardSharedWorkspace } from "./dashboard-shared-workspace";
import { DashboardShortcutsSection } from "./dashboard-shortcuts-section";
import { DashboardSkeletonUI } from "./dashboard-skeleton-ui";

interface DashboardUIProps {
  stats: {
    totalPatients: number;
    todayAppointments: number;
    activePrescriptions: number;
    uncodedVisits: number;
    newPatientsThisMonth: number;
  };
  recentActivity: DashboardStats["recentActivity"];
  upcomingAppointments: DashboardStats["upcomingAppointments"];
  recentPatients: DashboardPatient[];
  todayAppointments: AppointmentListItem[];
  completedToday: number;
  inProgressToday: number;
  currentPatient: AppointmentListItem | null | undefined;
  nextPatients: AppointmentListItem[];
  waitingCount: number;
  pendingJoinRequests: number;
  slotDurationMinutes?: number;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  canAccess: (feature: Feature) => boolean;
  headerActions?: ReactNode;
}

export function DashboardUI({
  stats,
  recentActivity,
  upcomingAppointments,
  recentPatients,
  todayAppointments,
  completedToday,
  inProgressToday,
  currentPatient,
  nextPatients,
  waitingCount,
  pendingJoinRequests,
  slotDurationMinutes = DEFAULT_SLOT_DURATION,
  isLoading,
  isError,
  onRetry,
  canAccess,
  headerActions,
}: DashboardUIProps) {
  const { t } = useTranslation("Dashboard");
  const headerSummary = useMemo(
    () => formatDashboardSummary(todayAppointments.length, waitingCount),
    [todayAppointments.length, waitingCount],
  );

  const header = (
    <DashboardHeaderContainer
      summary={headerSummary}
      headerActions={headerActions}
    />
  );

  if (isLoading) {
    return (
      <AppPageScaffold header={header}>
        <DashboardSkeletonUI variant="full" />
      </AppPageScaffold>
    );
  }

  if (isError) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage={t("loadError")}
          onRetry={onRetry}
        />
      </AppPageScaffold>
    );
  }

  if (isNewClinicDashboard(stats)) {
    return (
      <AppPageScaffold header={header}>
        <div className="space-y-4">
          <DataState
            status="empty"
            className="min-h-[50vh]"
            emptyIcon={LayoutDashboard}
            emptyTitle={t("welcomeTitle")}
            emptyDescription={t("welcomeDescription")}
            emptyAction={{ label: t("addFirstPatient"), href: "/patients" }}
          />
        </div>
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold header={header}>
      <DashboardSharedWorkspace
        mode="dashboard"
        todayAppointments={todayAppointments}
        completedToday={completedToday}
        inProgressToday={inProgressToday}
        currentPatient={currentPatient}
        nextPatients={nextPatients}
        waitingCount={waitingCount}
        pendingJoinRequests={pendingJoinRequests}
        uncodedVisits={stats.uncodedVisits}
        slotDurationMinutes={slotDurationMinutes}
      >
        <Section id="dashboard-overview" title={t("overviewTitle")}>
          <DashboardStatsGrid
            stats={stats}
            completedToday={completedToday}
            inProgressToday={inProgressToday}
          />
        </Section>

        <DashboardShortcutsSection uncodedVisits={stats.uncodedVisits} />

        <div
          className={cn(
            "grid gap-4 sm:gap-6",
            canAccess(Feature.CALENDAR_SLOTS)
              ? "lg:grid-cols-3"
              : "lg:grid-cols-1",
          )}
        >
          {canAccess(Feature.CALENDAR_SLOTS) ? (
            <TodayScheduleUI
              appointments={todayAppointments}
              className="lg:col-span-2"
            />
          ) : null}

          <div className="space-y-4 sm:space-y-6">
            <RecentPatientsUI
              patients={recentPatients.map((patient) => ({
                ...patient,
                phoneNumber: patient.phoneNumber ?? undefined,
              }))}
            />

            <DailyProgressUI
              completedToday={completedToday}
              totalAppointments={todayAppointments.length}
              uncodedVisits={stats.uncodedVisits}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <DashboardActivityFeed items={recentActivity} />
          <DashboardUpcomingCard upcoming={upcomingAppointments} />
        </div>
      </DashboardSharedWorkspace>
    </AppPageScaffold>
  );
}
