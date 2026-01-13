"use client";

import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { DashboardUI } from "@/features/dashboard/components/DashboardUI";

export default function DashboardPage() {
  const { state } = useDashboardLogic();

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
      isLoading={isLoading}
      canAccess={canAccess}
    />
  );
}
