"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardSharedWorkspace } from "@/features/dashboard/components/layout/dashboard-shared-workspace";
import { DashboardShortcutsSection } from "@/features/dashboard/components/layout/dashboard-shortcuts-section";
import { DashboardSkeletonUI } from "@/features/dashboard/components/layout/dashboard-skeleton-ui";
import { DashboardRefreshControl } from "@/features/dashboard/components/layout/dashboard-refresh-control";
import { TodayFollowUpsPanel } from "@/features/dashboard/components/follow-ups/today-follow-ups-panel";
import { TodayScheduleUI } from "@/features/dashboard/components/schedule/today-schedule-ui";
import { formatDashboardSummary } from "@/features/dashboard/lib/format-dashboard-summary";
import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { Feature } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/clinic-context";
import { usePermissions } from "@/hooks/use-permissions";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { LayoutDashboard } from "lucide-react";

export default function TodayPage() {
  const { clinic } = useClinic();
  const { canStartConsultation } = usePermissions();
  const { state } = useDashboardLogic();
  const {
    stats,
    todayAppointments,
    completedToday,
    inProgressToday,
    currentPatient,
    nextPatients,
    waitingCount,
    pendingJoinRequests,
    isLoading,
    isError,
    refetchAll,
    lastDataUpdatedAtMs,
    isRefreshing,
    canAccess,
  } = state;

  const summaryLine = useMemo(
    () => formatDashboardSummary(todayAppointments.length, waitingCount),
    [todayAppointments.length, waitingCount],
  );

  const headerActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <DashboardRefreshControl
          updatedAtMs={lastDataUpdatedAtMs}
          isRefreshing={isRefreshing}
          onRefresh={refetchAll}
        />
        {canStartConsultation ? (
          <Button variant="default" size="sm" asChild>
            <Link href="/consultation">Open queue</Link>
          </Button>
        ) : null}
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    ),
    [
      lastDataUpdatedAtMs,
      isRefreshing,
      refetchAll,
      canStartConsultation,
    ],
  );

  const header = (
    <PageHeader
      title="Today"
      description={
        summaryLine ??
        "Run today’s shift: queue, schedule, and follow-ups in one place."
      }
      actions={headerActions}
    />
  );

  if (isLoading) {
    return (
      <AppPageScaffold header={header}>
        <DashboardSkeletonUI variant="today" />
      </AppPageScaffold>
    );
  }

  if (isError) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage="We could not load today's workspace. Please try again."
          onRetry={refetchAll}
        />
      </AppPageScaffold>
    );
  }

  const isNewClinic =
    stats.totalPatients === 0 &&
    stats.todayAppointments === 0 &&
    stats.activePrescriptions === 0;

  if (isNewClinic) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="empty"
          className="min-h-[50vh]"
          emptyIcon={LayoutDashboard}
          emptyTitle="Start with your first patient"
          emptyDescription="Add a patient or schedule a visit to see your queue and today's appointments here."
          emptyAction={{ label: "Go to patients", href: "/patients" }}
        />
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold header={header}>
      <DashboardSharedWorkspace
        mode="today"
        todayAppointments={todayAppointments}
        completedToday={completedToday}
        inProgressToday={inProgressToday}
        currentPatient={currentPatient}
        nextPatients={nextPatients}
        waitingCount={waitingCount}
        pendingJoinRequests={pendingJoinRequests}
        pendingReports={stats.pendingReports}
        slotDurationMinutes={clinic?.slotDuration ?? 15}
      >
        <TodayFollowUpsPanel enabled={canAccess(Feature.CALENDAR_SLOTS)} />
        <DashboardShortcutsSection pendingReports={stats.pendingReports} />
        {canAccess(Feature.CALENDAR_SLOTS) ? (
          <TodayScheduleUI appointments={todayAppointments} />
        ) : null}
      </DashboardSharedWorkspace>
    </AppPageScaffold>
  );
}
