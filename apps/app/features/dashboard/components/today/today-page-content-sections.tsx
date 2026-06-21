"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DashboardSharedWorkspace } from "@/features/dashboard/components/layout/dashboard-shared-workspace";
import { DashboardSkeletonUI } from "@/features/dashboard/components/layout/dashboard-skeleton-ui";
import { DashboardRefreshControl } from "@/features/dashboard/components/layout/dashboard-refresh-control";
import { ClinicReferralShareToolbar } from "@/features/dashboard/components/layout/clinic-referral-share-toolbar";
import { TodayAdvisorRail } from "@/features/dashboard/components/advisor/today-advisor-rail";
import type { useClinicReferralShare } from "@/features/dashboard/hooks/use-clinic-referral-share";
import type { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import {
  BottomActionBar,
  BottomActionBarSlot,
} from "@workspace/ui/components/layout/bottom-action-bar";
import { cn } from "@workspace/ui/lib/utils";
import { LayoutDashboard, Play, Sparkles } from "lucide-react";
import type { TodayRailVisibility } from "./today-page-content-helpers";

const TodayMainWidgets = dynamic(
  () => import("./today-main-widgets").then((mod) => mod.TodayMainWidgets),
  { ssr: false },
);

const TodayRightRail = dynamic(
  () => import("./today-right-rail").then((mod) => mod.TodayRightRail),
  { ssr: false },
);

type TodayDashboardState = ReturnType<typeof useDashboardLogic>["state"];
type TodayReferralShare = ReturnType<typeof useClinicReferralShare>;

interface TodayHeaderActionsProps {
  lastDataUpdatedAtMs: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  canStartConsultation: boolean;
  onOpenAskAi: () => void;
}

export function TodayHeaderActions({
  lastDataUpdatedAtMs,
  isRefreshing,
  onRefresh,
  canStartConsultation,
  onOpenAskAi,
}: TodayHeaderActionsProps) {
  return (
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
          onRefresh={onRefresh}
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:items-center sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-10 min-h-10 flex-1 touch-manipulation sm:h-9 sm:min-h-0 sm:flex-none"
          onClick={onOpenAskAi}
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
  );
}

interface TodayPageHeaderProps extends TodayHeaderActionsProps {
  summaryLine?: string;
}

/**
 * Wraps `PageHeader` + `TodayHeaderActions` for the "Today" page — split out
 * so `TodayPageContent` doesn't need to assemble the header JSX shape inline
 * before every render branch (loading/error/empty/loaded all share it).
 */
export function TodayPageHeader({
  summaryLine,
  lastDataUpdatedAtMs,
  isRefreshing,
  onRefresh,
  canStartConsultation,
  onOpenAskAi,
}: TodayPageHeaderProps) {
  return (
    <PageHeader
      title="Today"
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

// jscpd:ignore-start
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

export function TodayRightRailSection({
// jscpd:ignore-end
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
  return (
    <section
      aria-labelledby="today-rail-heading"
      className={cn(
        "flex w-full min-w-0 shrink-0 flex-col gap-4",
        "rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 shadow-sm ring-1 ring-border/30",
        "sm:p-5",
        "xl:sticky xl:top-4 xl:w-72 xl:max-w-[20rem] xl:self-start xl:bg-card/95 xl:backdrop-blur-sm 2xl:w-80",
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
  hasNextPatient: boolean;
  hasCurrentPatient: boolean;
  isStarting: boolean;
  isMutationPending: boolean;
  onStartNextPatient: () => void;
}

export function TodayBottomBarSection({
  canStartConsultation,
  hasNextPatient,
  hasCurrentPatient,
  isStarting,
  isMutationPending,
  onStartNextPatient,
}: TodayBottomBarSectionProps) {
  if (!canStartConsultation || !hasNextPatient || hasCurrentPatient) return null;

  return (
    <BottomActionBar>
      <BottomActionBarSlot variant="secondary">
        <Button
          variant="outline"
          className="w-full touch-manipulation"
          asChild
        >
          <Link href="/consultation">View queue</Link>
        </Button>
      </BottomActionBarSlot>
      <BottomActionBarSlot variant="primary">
        <Button
          className="w-full touch-manipulation"
          disabled={isStarting || isMutationPending}
          onClick={onStartNextPatient}
        >
          <Play className="mr-2 size-4" aria-hidden />
          {isStarting ? "Starting…" : "Next patient"}
        </Button>
      </BottomActionBarSlot>
    </BottomActionBar>
  );
}

interface TodayHeaderSlotProps {
  header: ReactNode;
}

/** Loading shell — reuses the page header so the layout doesn't shift once data arrives. */
export function TodayLoadingState({ header }: TodayHeaderSlotProps) {
  return (
    <AppPageScaffold header={header}>
      <DashboardSkeletonUI variant="today" />
    </AppPageScaffold>
  );
}

interface TodayErrorStateProps extends TodayHeaderSlotProps {
  onRetry: () => void;
}

/** Error shell — split out of `TodayPageContent` so the loaded/error/empty branches are each easy to scan. */
export function TodayErrorState({ header, onRetry }: TodayErrorStateProps) {
  return (
    <AppPageScaffold header={header}>
      <DataState
        status="error"
        className="min-h-[50vh]"
        errorMessage="We could not load today's workspace. Please try again."
        onRetry={onRetry}
      />
    </AppPageScaffold>
  );
}

/** First-patient empty state shown when `isNewClinicDashboard` is true. */
export function TodayNewClinicEmptyState({
  header,
  slot,
}: TodayHeaderSlotProps & { slot?: ReactNode }) {
  return (
    <AppPageScaffold header={header}>
      {slot}
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

interface TodayWorkspaceLayoutProps {
  stats: TodayDashboardState["stats"];
  canStartConsultation: boolean;
  currentPatient: TodayDashboardState["currentPatient"];
  nextPatients: TodayDashboardState["nextPatients"];
  todayAppointments: TodayDashboardState["todayAppointments"];
  completedToday: number;
  inProgressToday: number;
  waitingCount: number;
  pendingJoinRequests: number;
  canAccess: TodayDashboardState["canAccess"];
  slotDurationMinutes: number;
  railVisibility: TodayRailVisibility;
  referralShare: TodayReferralShare;
}

/**
 * Main "Today" content layout — the shared workspace + widgets column plus
 * the conditional sharing/advisor rail. Split out of `TodayPageContent` so
 * the layout composition is independent of the data-fetching/derivation
 * wiring (the orchestrator only decides *whether* to render this).
 */
export function TodayWorkspaceLayout({
  stats,
  canStartConsultation,
  currentPatient,
  nextPatients,
  todayAppointments,
  completedToday,
  inProgressToday,
  waitingCount,
  pendingJoinRequests,
  canAccess,
  slotDurationMinutes,
  railVisibility,
  referralShare,
}: TodayWorkspaceLayoutProps) {
  const showBottomBarPadding =
    canStartConsultation && nextPatients[0] && !currentPatient;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:gap-8",
        showBottomBarPadding && "pb-24 md:pb-0",
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
          uncodedVisits={stats.uncodedVisits}
          slotDurationMinutes={slotDurationMinutes}
        >
          <TodayMainWidgets
            appointments={todayAppointments}
            uncodedVisits={stats.uncodedVisits}
            canAccess={canAccess}
          />
        </DashboardSharedWorkspace>
      </div>
      {railVisibility.showTodayRightColumn ? (
        <TodayRightRail
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
