"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardSharedWorkspace } from "@/features/dashboard/components/layout/dashboard-shared-workspace";
import { DashboardShortcutsSection } from "@/features/dashboard/components/layout/dashboard-shortcuts-section";
import { DashboardSkeletonUI } from "@/features/dashboard/components/layout/dashboard-skeleton-ui";
import { DashboardRefreshControl } from "@/features/dashboard/components/layout/dashboard-refresh-control";
import { TodayFollowUpsPanel } from "@/features/dashboard/components/follow-ups/today-follow-ups-panel";
import { TodayScheduleUI } from "@/features/dashboard/components/schedule/today-schedule-ui";
import { TodayAdvisorRail } from "@/features/dashboard/components/advisor/today-advisor-rail";
import { formatDashboardSummary } from "@/features/dashboard/lib/format-dashboard-summary";
import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { Feature } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/clinic-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useAskAi } from "@/features/_shared/components/ask-ai/ask-ai-context";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { LayoutDashboard, Sparkles } from "lucide-react";

export default function TodayPage() {
  const { clinic } = useClinic();
  const { canStartConsultation } = usePermissions();
  const { openOverlay } = useAskAi();
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
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            openOverlay({ id: "today", label: "on today's workspace" })
          }
          aria-label="Ask AI about today"
          data-testid="today-ask-ai"
        >
          <Sparkles className="size-4" aria-hidden />
          Ask AI
        </Button>
        {canStartConsultation ? (
          <Button variant="default" size="sm" asChild>
            <Link href="/consultation">Open queue</Link>
          </Button>
        ) : null}
      </div>
    ),
    [
      lastDataUpdatedAtMs,
      isRefreshing,
      refetchAll,
      canStartConsultation,
      openOverlay,
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
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
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
        </div>
        <TodayAdvisorRail
          pendingJoinRequests={pendingJoinRequests}
          pendingReports={stats.pendingReports}
          waitingCount={waitingCount}
        />
      </div>
    </AppPageScaffold>
  );
}
