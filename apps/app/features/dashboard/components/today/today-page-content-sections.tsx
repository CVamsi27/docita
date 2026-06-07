"use client";

import Link from "next/link";
import { DashboardRefreshControl } from "@/features/dashboard/components/layout/dashboard-refresh-control";
import { ClinicReferralShareToolbar } from "@/features/dashboard/components/layout/clinic-referral-share-toolbar";
import { TodayAdvisorRail } from "@/features/dashboard/components/advisor/today-advisor-rail";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import {
  BottomActionBar,
  BottomActionBarSlot,
} from "@workspace/ui/components/layout/bottom-action-bar";
import { cn } from "@workspace/ui/lib/utils";
import { Play, Sparkles } from "lucide-react";

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

// jscpd:ignore-start
interface TodayRightRailSectionProps {
  hasShareRailContent: boolean;
  hasAdvisorRailContent: boolean;
  referralCode?: string | null;
  clinicName?: string | null;
  publicOnlineBookingUrl?: string | null;
  canQuickShareClinicCode: boolean;
  pendingJoinRequests: number;
  pendingReports: number;
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
  pendingReports,
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
          pendingReports,
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
