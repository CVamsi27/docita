
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DashboardSkeletonUI } from "@/features/dashboard/components/layout/dashboard-skeleton-ui";
import { DataState } from "@workspace/ui/components/data-display/data-state";

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
  const { t } = useTranslation("Dashboard");
  return (
    <AppPageScaffold header={header}>
      <DataState
        status="error"
        className="min-h-[50vh]"
        errorMessage={t("stateShells.loadError")}
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
  const { t } = useTranslation("Dashboard");
  return (
    <AppPageScaffold header={header}>
      {slot}
      <DataState
        status="empty"
        className="min-h-[50vh]"
        emptyIcon={LayoutDashboard}
        emptyTitle={t("stateShells.emptyTitle")}
        emptyDescription={t("stateShells.emptyDescription")}
        emptyAction={{ label: t("stateShells.emptyAction"), href: "/patients" }}
      />
    </AppPageScaffold>
  );
}
