"use client";

import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { DashboardUI } from "@/features/dashboard/components";
import { useClinic } from "@/lib/clinic-context";

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
    isLoading,
    isError,
    refetch,
    canAccess,
  } = state;

  return (
    <DashboardUI
      stats={stats}
      recentPatients={castRecentPatients}
      todayAppointments={todayAppointments}
      completedToday={completedToday}
      inProgressToday={inProgressToday}
      currentPatient={currentPatient}
      nextPatients={nextPatients}
      waitingCount={waitingCount}
      slotDurationMinutes={clinic?.slotDuration ?? 15}
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      canAccess={canAccess}
    />
  );
}
