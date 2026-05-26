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
import { useClinicReferralShare } from "@/features/dashboard/hooks/use-clinic-referral-share";
import { ClinicReferralShareToolbar } from "@/features/dashboard/components/layout/clinic-referral-share-toolbar";
import { Feature } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/contexts/clinic-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { cn } from "@workspace/ui/lib/utils";
import { LayoutDashboard, Sparkles } from "lucide-react";

export function TodayPageContent() {
  const { clinic } = useClinic();
  const {
    referralCode,
    publicOnlineBookingUrl,
    canQuickShareClinicCode,
    clinicName,
  } = useClinicReferralShare();
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
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-2.5",
          "rounded-[var(--radius-md)] border border-border/70 bg-muted/25 p-3 shadow-sm ring-1 ring-border/25",
          "sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          <DashboardRefreshControl
            updatedAtMs={lastDataUpdatedAtMs}
            isRefreshing={isRefreshing}
            onRefresh={refetchAll}
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:items-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-10 min-h-10 flex-1 touch-manipulation sm:h-9 sm:min-h-0 sm:flex-none"
            onClick={() =>
              openOverlay({ id: "today", label: "on today's workspace" })
            }
            aria-label="Ask AI about today"
            data-testid="today-ask-ai"
          >
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Ask AI</span>
          </Button>
          {canStartConsultation ? (
            <Button
              variant="default"
              size="sm"
              className="h-10 min-h-10 flex-1 touch-manipulation sm:h-9 sm:min-h-0 sm:flex-none"
              asChild
            >
              <Link href="/consultation">Open queue</Link>
            </Button>
          ) : null}
        </div>
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
      description={summaryLine ?? undefined}
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

  const hasShareRailContent = Boolean(referralCode || publicOnlineBookingUrl);
  const hasAdvisorRailContent =
    pendingJoinRequests > 0 || stats.pendingReports > 0 || waitingCount > 0;
  const showTodayRightColumn = hasShareRailContent || hasAdvisorRailContent;

  return (
    <AppPageScaffold header={header}>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_20rem]">
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
        {showTodayRightColumn ? (
          <section
            aria-labelledby="today-rail-heading"
            className={cn(
              "flex w-full min-w-0 shrink-0 flex-col gap-4",
              "rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 shadow-sm ring-1 ring-border/30",
              "sm:p-5",
              "xl:sticky xl:top-4 xl:w-full xl:self-start xl:bg-card/95 xl:backdrop-blur-sm",
            )}
          >
            <h2 className="sr-only" id="today-rail-heading">
              Sharing and recommendations
            </h2>
            <MicroLabel
              as="p"
              className="border-b border-border/60 pb-2 text-[length:var(--fs-2xs)] xl:hidden"
            >
              {hasShareRailContent && hasAdvisorRailContent
                ? "Sharing & tips"
                : hasShareRailContent
                  ? "Sharing"
                  : "Tips"}
            </MicroLabel>
            {hasShareRailContent ? (
              <ClinicReferralShareToolbar
                variant="rail"
                clinicCode={referralCode}
                clinicName={clinicName}
                publicOnlineBookingUrl={publicOnlineBookingUrl}
                canQuickShareClinicCode={canQuickShareClinicCode}
              />
            ) : null}
            <TodayAdvisorRail
              pendingJoinRequests={pendingJoinRequests}
              pendingReports={stats.pendingReports}
              waitingCount={waitingCount}
            />
          </section>
        ) : null}
      </div>
    </AppPageScaffold>
  );
}
