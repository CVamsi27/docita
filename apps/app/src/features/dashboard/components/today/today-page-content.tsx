import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  TodayBottomBarSection,
  TodayPageHeader,
  TodayWorkspaceLayout,
} from "./today-page-content-sections";
import {
  TodayErrorState,
  TodayLoadingState,
  TodayNewClinicEmptyState,
} from "./today-page-state-shells";
import { isNewClinicDashboard } from "@/features/dashboard/lib/is-new-clinic-dashboard";
import { formatDashboardSummary } from "@/features/dashboard/lib/format-dashboard-summary";
import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { useClinicReferralShare } from "@/features/dashboard/hooks/use-clinic-referral-share";
import { useClinic } from "@/lib/contexts/clinic-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { useSessionRecoveryRedirect } from "@/hooks/use-session-recovery-redirect";
import { isSessionRecoveryError } from "@/lib/auth/session-recovery";
import { DEFAULT_SLOT_DURATION } from "@workspace/utils";
import { useStartNextPatient } from "./use-start-next-patient";
import { deriveTodayRailVisibility } from "./today-page-content-helpers";

export function TodayPageContent() {
  const { t } = useTranslation("Dashboard");
  const { clinic } = useClinic();
  const referralShare = useClinicReferralShare();
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

  const { isMutationPending, handleStartNextPatient } = useStartNextPatient({
    nextAppointmentId: nextPatients[0]?.id,
  });

  const header = (
    <TodayPageHeader
      summaryLine={summaryLine}
      lastDataUpdatedAtMs={lastDataUpdatedAtMs}
      isRefreshing={isRefreshing}
      onRefresh={refetchAll}
      canStartConsultation={canStartConsultation}
      onOpenAskAi={() =>
        openOverlay({ id: "today", label: t("today.askAiScope") })
      }
    />
  );

  if (isLoading || isRecoveringSession) {
    return <TodayLoadingState header={header} />;
  }
  if (isError && !isSessionRecoveryError(statsError)) {
    return <TodayErrorState header={header} onRetry={refetchAll} />;
  }
  if (isNewClinicDashboard(stats)) {
    return <TodayNewClinicEmptyState header={header} />;
  }

  const railVisibility = deriveTodayRailVisibility({
    referralCode: referralShare.referralCode,
    publicOnlineBookingUrl: referralShare.publicOnlineBookingUrl,
    pendingJoinRequests,
    uncodedVisits: stats.uncodedVisits,
    waitingCount,
  });

  return (
    <AppPageScaffold header={header}>
      <TodayWorkspaceLayout
        stats={stats}
        canStartConsultation={canStartConsultation}
        currentPatient={currentPatient}
        nextPatients={nextPatients}
        todayAppointments={todayAppointments}
        completedToday={completedToday}
        inProgressToday={inProgressToday}
        waitingCount={waitingCount}
        pendingJoinRequests={pendingJoinRequests}
        canAccess={canAccess}
        slotDurationMinutes={clinic?.slotDuration ?? DEFAULT_SLOT_DURATION}
        railVisibility={railVisibility}
        referralShare={referralShare}
      />
      <TodayBottomBarSection
        canStartConsultation={canStartConsultation}
        nextPatient={nextPatients[0] ?? null}
        hasCurrentPatient={!!currentPatient}
        isStarting={isMutationPending}
        isMutationPending={isMutationPending}
        onStartNextPatient={handleStartNextPatient}
      />
    </AppPageScaffold>
  );
}
