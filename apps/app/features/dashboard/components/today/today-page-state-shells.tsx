"use client";

import type { ReactNode } from "react";
import { LayoutDashboard } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DashboardSkeletonUI } from "@/features/dashboard/components/layout/dashboard-skeleton-ui";
import { DataState } from "@workspace/ui/components/data-display/data-state";

export interface TodayHeaderSlotProps {
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
