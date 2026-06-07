"use client";

import { useMemo } from "react";
import { Feature, Tier } from "@workspace/types";
import { FeatureGate, TierGate } from "@/components/auth/feature-gate";

import { useQueue } from "@workspace/data-access";
import { DEFAULT_SLOT_DURATION } from "@workspace/utils";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/utils/queue-token-status";
import { DeskFloorPanelUI, type DeskFloorCurrent } from "./DeskFloorPanelUI";
import { patientNameOf, recentSort, toRow, tokenSort } from "./desk-floor-panel-helpers";

const RECENTLY_COMPLETED_LIMIT = 6;

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
    const slotMinutes =
      inProgressItems[0]?.estimatedDuration || DEFAULT_SLOT_DURATION;
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