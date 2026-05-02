"use client";

import { useMemo } from "react";
import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { DashboardUI } from "@/features/dashboard/components";
import { useClinic } from "@/lib/clinic-context";
import { DashboardRefreshControl } from "@/features/dashboard/components/layout/dashboard-refresh-control";

export default function DashboardPage() {
  const { state } = useDashboardLogic();
  const { clinic } = useClinic();

  const {
    stats,
    castRecentPatients,
    todayAppointments,
    completedToday,
    inProgressToday,
    currentPatient,
    nextPatients,
    waitingCount,
    pendingJoinRequests,
    recentActivity,
    upcomingAppointments,
    isLoading,
    isError,
    refetchAll,
    lastDataUpdatedAtMs,
    isRefreshing,
    canAccess,
  } = state;

  const headerActions = useMemo(
    () => (
      <DashboardRefreshControl
        updatedAtMs={lastDataUpdatedAtMs}
        isRefreshing={isRefreshing}
        onRefresh={refetchAll}
      />
    ),
    [lastDataUpdatedAtMs, isRefreshing, refetchAll],
  );

  return (
    <DashboardUI
      stats={stats}
      recentActivity={recentActivity}
      upcomingAppointments={upcomingAppointments}
      recentPatients={castRecentPatients}
      todayAppointments={todayAppointments}
      completedToday={completedToday}
      inProgressToday={inProgressToday}
      currentPatient={currentPatient}
      nextPatients={nextPatients}
      waitingCount={waitingCount}
      pendingJoinRequests={pendingJoinRequests}
      slotDurationMinutes={clinic?.slotDuration ?? 15}
      isLoading={isLoading}
      isError={isError}
      onRetry={refetchAll}
      canAccess={canAccess}
      headerActions={headerActions}
    />
  );
}
