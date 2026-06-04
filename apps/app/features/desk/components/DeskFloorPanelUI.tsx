"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { NowServingBoard } from "@workspace/ui/components/data-display/now-serving-board";
import {
  LoadingState,
} from "@workspace/ui/components/feedback/empty-state";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  FloorStatsSection,
  WaitingListSection,
  RecentlyCompletedSection,
  formatToken,
  type DeskFloorRow,
} from "./DeskFloorPanelUISections";

export type { DeskFloorRow } from "./DeskFloorPanelUISections";

export interface DeskFloorCurrent {
  tokenNumber: number;
  patientName: string;
  doctorName?: string | null;
}

export interface DeskFloorPanelUIProps {
  current: DeskFloorCurrent | null;
  waiting: DeskFloorRow[];
  recentlyCompleted: DeskFloorRow[];
  waitingCount: number;
  inProgressCount: number;
  completedCount: number;
  avgWaitMinutes: number | null;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function DeskFloorPanelUI({
  current,
  waiting,
  recentlyCompleted,
  waitingCount,
  inProgressCount,
  completedCount,
  avgWaitMinutes,
  isLoading,
  isError,
  onRetry,
}: DeskFloorPanelUIProps) {
  const header = (
    <PageHeader
      eyebrow="Front desk"
      title="OPD floor"
      description="Token goes out on WhatsApp the moment you call it."
    />
  );

  if (isLoading) {
    return (
      <AppPageScaffold header={header}>
        <LoadingState message="Loading the floor…" className="min-h-[40vh]" />
      </AppPageScaffold>
    );
  }

  if (isError) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[40vh]"
          errorMessage="We could not load the queue. Please try again."
          onRetry={onRetry}
        />
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold header={header}>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <NowServingBoard
          token={current ? formatToken(current.tokenNumber) : null}
          patientName={current?.patientName ?? null}
          waiting={waitingCount}
          avgWaitMinutes={avgWaitMinutes}
          status={current ? "live" : "idle"}
          eyebrow={
            current?.doctorName ? `With ${current.doctorName}` : "Now serving"
          }
        />

        <FloorStatsSection
          waitingCount={waitingCount}
          inProgressCount={inProgressCount}
          completedCount={completedCount}
        />
      </div>

      <WaitingListSection waiting={waiting} />
      <RecentlyCompletedSection recentlyCompleted={recentlyCompleted} />
    </AppPageScaffold>
  );
}
