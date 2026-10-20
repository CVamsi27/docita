import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { TodayLedger } from "@/features/dashboard/components/today/today-ledger";
import { DashboardRefreshControl } from "@/features/dashboard/components/layout/dashboard-refresh-control";
import { ClinicReferralShareToolbar } from "@/features/dashboard/components/layout/clinic-referral-share-toolbar";
import { TodayAdvisorRail } from "@/features/dashboard/components/advisor/today-advisor-rail";
import { TodayMainWidgets } from "./today-main-widgets";
import type { useClinicReferralShare } from "@/features/dashboard/hooks/use-clinic-referral-share";
import type { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import {
  BottomActionBar,
  BottomActionBarSlot,
} from "@workspace/ui/components/layout/bottom-action-bar";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/indicators/avatar";
import { cn } from "@workspace/ui/lib/utils";
import { Play, Sparkles } from "lucide-react";
import { formatDate, getPatientFullName } from "@workspace/utils";
import { getInitials } from "@/lib/formatters";
import type { TodayRailVisibility } from "./today-page-content-helpers";

type TodayDashboardState = ReturnType<typeof useDashboardLogic>["state"];
type TodayReferralShare = ReturnType<typeof useClinicReferralShare>;

interface TodayHeaderActionsProps {
  lastDataUpdatedAtMs: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  canStartConsultation: boolean;
  onOpenAskAi: () => void;
}

function TodayHeaderActions({
  lastDataUpdatedAtMs,
  isRefreshing,
  onRefresh,
  canStartConsultation,
  onOpenAskAi,
}: TodayHeaderActionsProps) {
  const { t } = useTranslation("Dashboard");
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5",
        "border-b border-border/60 pb-3",
        "sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <DashboardRefreshControl
          updatedAtMs={lastDataUpdatedAtMs}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:items-center sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-10 min-h-10 flex-1 touch-manipulation sm:h-9 sm:min-h-0 sm:flex-none border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10 transition-colors duration-150"
          onClick={(event) => {
            event.currentTarget.focus();
            onOpenAskAi();
          }}
          aria-label={t("today.askAiAria")}
          data-testid="today-ask-ai"
        >
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{t("today.askAiButton")}</span>
        </Button>
        {canStartConsultation ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 min-h-10 flex-1 touch-manipulation sm:h-9 sm:min-h-0 sm:flex-none"
            asChild
          >
            <Link to="/consultation">{t("today.openQueueButton")}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface TodayPageHeaderProps extends TodayHeaderActionsProps {
  summaryLine?: string;
}

export function TodayPageHeader({
  summaryLine,
  lastDataUpdatedAtMs,
  isRefreshing,
  onRefresh,
  canStartConsultation,
  onOpenAskAi,
}: TodayPageHeaderProps) {
  const { t } = useTranslation("Dashboard");
  return (
    <PageHeader
      title={t("today.pageTitle")}
      description={summaryLine}
      actions={
        <TodayHeaderActions
          lastDataUpdatedAtMs={lastDataUpdatedAtMs}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          canStartConsultation={canStartConsultation}
          onOpenAskAi={onOpenAskAi}
        />
      }
    />
  );
}

interface TodayRightRailSectionProps {
  hasShareRailContent: boolean;
  hasAdvisorRailContent: boolean;
  referralCode?: string | null;
  clinicName?: string | null;
  publicOnlineBookingUrl?: string | null;
  canQuickShareClinicCode: boolean;
  pendingJoinRequests: number;
  uncodedVisits: number;
  waitingCount: number;
}

function TodayRightRailSection({
  hasShareRailContent,
  hasAdvisorRailContent,
  referralCode,
  clinicName,
  publicOnlineBookingUrl,
  canQuickShareClinicCode,
  pendingJoinRequests,
  uncodedVisits,
  waitingCount,
}: TodayRightRailSectionProps) {
  const { t } = useTranslation("Dashboard");
  return (
    <section
      aria-labelledby="today-rail-heading"
      className={cn(
        "flex w-full min-w-0 shrink-0 flex-col gap-4",
        "border-t border-border/70 pt-5",
        "sm:grid sm:grid-cols-2 sm:items-start",
      )}
    >
      <h2 className="sr-only" id="today-rail-heading">
        {t("today.railHeading")}
      </h2>
      <MicroLabel
        as="p"
        className="border-b border-border/60 pb-2 text-[length:var(--fs-2xs)] xl:hidden"
      >
        {hasShareRailContent && hasAdvisorRailContent
          ? t("today.railLabelTips")
          : hasShareRailContent
            ? t("today.railLabelSharing")
            : t("today.railLabelBoth")}
      </MicroLabel>
      {hasShareRailContent ? (
        <ClinicReferralShareToolbar
          variant="rail"
          clinicCode={referralCode ?? undefined}
          clinicName={clinicName ?? undefined}
          publicOnlineBookingUrl={publicOnlineBookingUrl ?? undefined}
          canQuickShareClinicCode={canQuickShareClinicCode}
        />
      ) : null}
      <TodayAdvisorRail
        advisorCounts={{
          pendingJoinRequests,
          uncodedVisits,
          waitingCount,
        }}
      />
    </section>
  );
}

interface TodayBottomBarSectionProps {
  canStartConsultation: boolean;
  nextPatient: TodayDashboardState["nextPatients"][number] | null;
  hasCurrentPatient: boolean;
  currentPatient?: TodayDashboardState["currentPatient"];
  isStarting: boolean;
  isMutationPending: boolean;
  onStartNextPatient: () => void;
}

/** Preserve current encounter access even when nobody is waiting. */
export function TodayBottomBarSection({
  canStartConsultation,
  nextPatient,
  hasCurrentPatient,
  currentPatient,
  isStarting,
  isMutationPending,
  onStartNextPatient,
}: TodayBottomBarSectionProps) {
  const { t } = useTranslation("Dashboard");

  if (!canStartConsultation || (!nextPatient && !currentPatient)) return null;

  if (currentPatient) {
    return (
      <BottomActionBar aria-label={t("today.bottomBarAria")}>
        {nextPatient ? (
          <BottomActionBarSlot variant="secondary">
            <Button
              variant="outline"
              disabled={isStarting || isMutationPending}
              onClick={onStartNextPatient}
              aria-label={t("today.startNextAria", {
                name: getPatientFullName(nextPatient.patient),
              })}
            >
              {t(isStarting ? "today.startingButton" : "today.startNextButton")}
            </Button>
          </BottomActionBarSlot>
        ) : null}
        <BottomActionBarSlot variant="primary">
          <Button
            variant="primary"
            asChild
            className="h-full w-full whitespace-normal"
          >
            <Link to={`/consultation/${currentPatient.id}`}>
              {t("schedule.continueConsultation")}
            </Link>
          </Button>
        </BottomActionBarSlot>
      </BottomActionBar>
    );
  }
  if (!nextPatient) return null;

  const nextPatientName = getPatientFullName(nextPatient.patient);

  return (
    <BottomActionBar aria-label={t("today.bottomBarAria")}>
      <BottomActionBarSlot variant="secondary">
        {hasCurrentPatient ? (
          <NextPatientPreview nextPatient={nextPatient} />
        ) : (
          <Button
            variant="outline"
            className="w-full touch-manipulation"
            asChild
          >
            <Link to="/consultation">{t("today.viewQueueButton")}</Link>
          </Button>
        )}
      </BottomActionBarSlot>
      <BottomActionBarSlot variant="primary">
        <Button
          variant="primary"
          className="w-full touch-manipulation"
          disabled={isStarting || isMutationPending}
          onClick={onStartNextPatient}
          // Keep the visible action phrase in its accessible name for voice control.
          aria-label={t("today.startNextAria", { name: nextPatientName })}
        >
          <Play className="mr-2 size-4" aria-hidden />
          {isStarting ? t("today.startingButton") : t("today.startNextButton")}
        </Button>
      </BottomActionBarSlot>
    </BottomActionBar>
  );
}

interface NextPatientPreviewProps {
  nextPatient: TodayDashboardState["nextPatients"][number];
}

function NextPatientPreview({ nextPatient }: NextPatientPreviewProps) {
  const { t } = useTranslation("Dashboard");
  const fullName = getPatientFullName(nextPatient.patient);
  const formattedTime = nextPatient.startTime
    ? formatDate(nextPatient.startTime, "hh:mm a")
    : null;

  return (
    <div className="flex w-full items-center gap-2.5 rounded-[var(--radius)] border border-border/60 bg-card/80 px-3 py-2 text-left shadow-sm">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="border border-border/60 bg-background/70 text-foreground text-[length:var(--fs-2xs)] font-semibold">
          {getInitials(
            nextPatient.patient?.firstName ?? "",
            nextPatient.patient?.lastName,
          )}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("today.nextUpLabel")}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {fullName}
          {formattedTime ? (
            <span className="ml-1.5 font-normal text-muted-foreground">
              &middot; {formattedTime}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

interface TodayWorkspaceLayoutProps {
  stats: TodayDashboardState["stats"];
  canStartConsultation: boolean;
  currentPatient: TodayDashboardState["currentPatient"];
  nextPatients: TodayDashboardState["nextPatients"];
  todayAppointments: TodayDashboardState["todayAppointments"];
  completedToday: number;
  waitingCount: number;
  pendingJoinRequests: number;
  canAccess: TodayDashboardState["canAccess"];
  isStarting: boolean;
  onStartNextPatient: () => void;
  timezone?: string;
  railVisibility: TodayRailVisibility;
  referralShare: TodayReferralShare;
}

/** Keeps queue and current visit ahead of follow-ups and operational tasks. */
export function TodayWorkspaceLayout({
  stats,
  canStartConsultation,
  currentPatient,
  nextPatients,
  todayAppointments,
  completedToday,
  waitingCount,
  pendingJoinRequests,
  canAccess,
  railVisibility,
  referralShare,
  isStarting,
  onStartNextPatient,
  timezone,
}: TodayWorkspaceLayoutProps) {
  const showBottomBarPadding =
    canStartConsultation && (currentPatient || nextPatients[0]);
  return (
    <div
      className={cn(
        "min-w-0 space-y-6",
        showBottomBarPadding && "pb-28 md:pb-0",
      )}
    >
      <TodayLedger
        appointments={todayAppointments}
        currentPatient={currentPatient}
        nextPatient={nextPatients[0]}
        canStartConsultation={canStartConsultation}
        waitingCount={waitingCount}
        completedToday={completedToday}
        timezone={timezone}
        isStarting={isStarting}
        onStartNextPatient={onStartNextPatient}
      />
      <TodayMainWidgets
        uncodedVisits={stats.uncodedVisits}
        canAccess={canAccess}
      />
      {railVisibility.showTodayRightColumn ? (
        <TodayRightRailSection
          hasShareRailContent={railVisibility.hasShareRailContent}
          hasAdvisorRailContent={railVisibility.hasAdvisorRailContent}
          referralCode={referralShare.referralCode}
          clinicName={referralShare.clinicName}
          publicOnlineBookingUrl={referralShare.publicOnlineBookingUrl}
          canQuickShareClinicCode={referralShare.canQuickShareClinicCode}
          pendingJoinRequests={pendingJoinRequests}
          uncodedVisits={stats.uncodedVisits}
          waitingCount={waitingCount}
        />
      ) : null}
    </div>
  );
}
