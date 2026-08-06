import { useTranslation } from "react-i18next";
import { AppPageScaffold, DataState, LoadingState, NowServingBoard, PageHeader } from "@workspace/ui/components";
import { FloorStatsSection, WaitingListSection, RecentlyCompletedSection } from "./DeskFloorPanelUISections";
import { formatToken, type DeskFloorRow } from "./desk-floor-panel-helpers";


export interface DeskFloorCurrent {
  tokenNumber: number;
  patientName: string;
  doctorName?: string | null;
}

interface DeskFloorPanelUIProps {
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
  const { t } = useTranslation("Desk");
  const header = (
    <PageHeader
      eyebrow={t("floor.eyebrow")}
      title={t("floor.title")}
      description={t("floor.description")}
    />
  );
  if (isLoading)
    return (
      <AppPageScaffold header={header}>
        <LoadingState message={t("floor.loading")} className="min-h-[40vh]" />
      </AppPageScaffold>
    );
  if (isError)
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[40vh]"
          errorMessage={t("floor.error")}
          onRetry={onRetry}
        />
      </AppPageScaffold>
    );
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
            current?.doctorName ? t("floor.nowServingWith", { doctor: current.doctorName }) : t("floor.nowServing")
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
