"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSharedWorkspace } from "@/features/dashboard/components/layout/dashboard-shared-workspace";
import { DashboardShortcutsSection } from "@/features/dashboard/components/layout/dashboard-shortcuts-section";
import { DashboardSkeletonUI } from "@/features/dashboard/components/layout/dashboard-skeleton-ui";
import { TodayFollowUpsPanel } from "@/features/dashboard/components/follow-ups/today-follow-ups-panel";
import { TodayScheduleUI } from "@/features/dashboard/components/schedule/today-schedule-ui";
import { formatDashboardSummary } from "@/features/dashboard/lib/format-dashboard-summary";
import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { useClinicReferralShare } from "@/features/dashboard/hooks/use-clinic-referral-share";
import { Feature } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/contexts/clinic-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useSessionRecoveryRedirect } from "@/hooks/use-session-recovery-redirect";
import { isSessionRecoveryError } from "@/lib/auth/session-recovery";
import { cn } from "@workspace/ui/lib/utils";
import { DEFAULT_SLOT_DURATION } from "@workspace/utils";
import { LayoutDashboard } from "lucide-react";
import {
  TodayHeaderActions,
  TodayRightRailSection,
  TodayBottomBarSection,
} from "./today-page-content-sections";

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
  const router = useRouter();
  const startConsultation = useStartConsultation();
  const [startingNext, setStartingNext] = useState(false);
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
    statsError,
    refetchAll,
    lastDataUpdatedAtMs,
    isRefreshing,
    canAccess,
  } = state;

  const isRecoveringSession = useSessionRecoveryRedirect({
    error: statsError,
    onRecovered: refetchAll,
  });

  const summaryLine = useMemo(
    () => formatDashboardSummary(todayAppointments.length, waitingCount),
    [todayAppointments.length, waitingCount],
  );

  const header = (
    <PageHeader
      title="Today"
      description={summaryLine ?? undefined}
      actions={
        <TodayHeaderActions
          lastDataUpdatedAtMs={lastDataUpdatedAtMs}
          isRefreshing={isRefreshing}
          onRefresh={refetchAll}
          canStartConsultation={canStartConsultation}
          onOpenAskAi={() =>
            openOverlay({ id: "today", label: "on today's workspace" })
          }
        />
      }
    />
  );

  if (isLoading || isRecoveringSession) {
    return (
      <AppPageScaffold header={header}>
        <DashboardSkeletonUI variant="today" />
      </AppPageScaffold>
    );
  }

  if (isError && !isSessionRecoveryError(statsError)) {
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

  const handleStartNextPatient = async () => {
    const next = nextPatients[0];
    if (!next) return;
    try {
      setStartingNext(true);
      const result = await startConsultation.mutateAsync({
        appointmentId: next.id,
      });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not open this consultation. Please try again.",
        "save",
      );
    } finally {
      setStartingNext(false);
    }
  };

  return (
    <AppPageScaffold header={header}>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:gap-8",
          canStartConsultation &&
            nextPatients[0] &&
            !currentPatient &&
            "pb-24 md:pb-0",
        )}
      >
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
            slotDurationMinutes={clinic?.slotDuration ?? DEFAULT_SLOT_DURATION}
          >
            <TodayFollowUpsPanel enabled={canAccess(Feature.CALENDAR_SLOTS)} />
            <DashboardShortcutsSection pendingReports={stats.pendingReports} />
            {canAccess(Feature.CALENDAR_SLOTS) ? (
              <TodayScheduleUI appointments={todayAppointments} />
            ) : null}
          </DashboardSharedWorkspace>
        </div>
        {showTodayRightColumn ? (
          <TodayRightRailSection
            hasShareRailContent={hasShareRailContent}
            hasAdvisorRailContent={hasAdvisorRailContent}
            referralCode={referralCode}
            clinicName={clinicName}
            publicOnlineBookingUrl={publicOnlineBookingUrl}
            canQuickShareClinicCode={canQuickShareClinicCode}
            pendingJoinRequests={pendingJoinRequests}
            pendingReports={stats.pendingReports}
            waitingCount={waitingCount}
          />
        ) : null}
      </div>
      <TodayBottomBarSection
        canStartConsultation={canStartConsultation}
        hasNextPatient={!!nextPatients[0]}
        hasCurrentPatient={!!currentPatient}
        isStarting={startingNext}
        isMutationPending={startConsultation.isPending}
        onStartNextPatient={handleStartNextPatient}
      />
    </AppPageScaffold>
  );
}
