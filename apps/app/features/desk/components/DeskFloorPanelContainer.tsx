"use client";

import { useMemo } from "react";
import { Feature, Tier } from "@workspace/types";
import {
  FeatureGate,
  TierGate,
} from "@/components/auth/feature-gate";

import { useQueue, type QueueItem } from "@workspace/data-access";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/utils/queue-token-status";
import { getOpdQueueSummaryLine } from "@/features/consultation";
import {
  DeskFloorPanelUI,
  type DeskFloorCurrent,
  type DeskFloorRow,
} from "./DeskFloorPanelUI";

const RECENTLY_COMPLETED_LIMIT = 6;
const DEFAULT_SLOT_MINUTES = 15;

function patientNameOf(item: QueueItem): string {
  const first = item.patient?.firstName?.trim() ?? "";
  const last = item.patient?.lastName?.trim() ?? "";
  return `${first} ${last}`.trim() || "Unknown patient";
}

function toRow(item: QueueItem): DeskFloorRow {
  return {
    id: item.id,
    tokenNumber: item.tokenNumber,
    patientName: patientNameOf(item),
    scheduledTime: item.scheduledTime ?? null,
    doctorName: item.doctor?.name ?? item.appointment?.doctor?.name ?? null,
    visitSummary: getOpdQueueSummaryLine(item),
    isWalkIn: item.tokenType === "walk-in" || item.tokenType === "late-arrival",
  };
}

function tokenSort(a: DeskFloorRow, b: DeskFloorRow): number {
  return a.tokenNumber - b.tokenNumber;
}

function recentSort(a: QueueItem, b: QueueItem): number {
  const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
  const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
  return tb - ta;
}

export function DeskFloorPanelContainer() {
  const { data, isLoading, isError, refetch } = useQueue();

  const view = useMemo(() => {
    const items = data ?? [];
    const waiting = items
      .filter((item) => isQueueTokenWaiting(item.status))
      .map(toRow)
      .sort(tokenSort);
    const inProgressItems = items.filter((item) =>
      isQueueTokenInProgress(item.status),
    );
    const completedItems = items.filter((item) =>
      isQueueTokenCompleted(item.status),
    );
    const recentlyCompleted = [...completedItems]
      .sort(recentSort)
      .slice(0, RECENTLY_COMPLETED_LIMIT)
      .map(toRow);

    const liveItem = inProgressItems[0] ?? null;
    const current: DeskFloorCurrent | null = liveItem
      ? {
          tokenNumber: liveItem.tokenNumber,
          patientName: patientNameOf(liveItem),
          doctorName:
            liveItem.doctor?.name ?? liveItem.appointment?.doctor?.name ?? null,
        }
      : null;

    const slotMinutes = inProgressItems[0]?.estimatedDuration || DEFAULT_SLOT_MINUTES;
    const avgWaitMinutes =
      waiting.length > 0 ? waiting.length * slotMinutes : null;

    return {
      current,
      waiting,
      recentlyCompleted,
      waitingCount: waiting.length,
      inProgressCount: inProgressItems.length,
      completedCount: completedItems.length,
      avgWaitMinutes,
    };
  }, [data]);

  return (
    <TierGate tier={Tier.HOSPITAL} showLockedCard>
      <FeatureGate feature={Feature.QUEUE_MANAGEMENT} showLockedCard>
    <DeskFloorPanelUI
      current={view.current}
      waiting={view.waiting}
      recentlyCompleted={view.recentlyCompleted}
      waitingCount={view.waitingCount}
      inProgressCount={view.inProgressCount}
      completedCount={view.completedCount}
      avgWaitMinutes={view.avgWaitMinutes}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
    />
      </FeatureGate>
    </TierGate>
  );
}
