"use client";

import { TodayFollowUpsPanel } from "@/features/dashboard/components/follow-ups/today-follow-ups-panel";
import { TodayScheduleUI } from "@/features/dashboard/components/schedule/today-schedule-ui";
import { DashboardShortcutsSection } from "@/features/dashboard/components/layout/dashboard-shortcuts-section";
import { Feature } from "@/lib/stores/permission-store";
import type { AppointmentListItem } from "@workspace/data-access";

interface TodayMainWidgetsProps {
  appointments: AppointmentListItem[];
  uncodedVisits: number;
  canAccess: (feature: Feature) => boolean;
}

export function TodayMainWidgets({
  appointments,
  uncodedVisits,
  canAccess,
}: TodayMainWidgetsProps) {
  return (
    <>
      <TodayFollowUpsPanel enabled={canAccess(Feature.CALENDAR_SLOTS)} />
      <DashboardShortcutsSection uncodedVisits={uncodedVisits} />
      {canAccess(Feature.CALENDAR_SLOTS) ? (
        <TodayScheduleUI appointments={appointments} />
      ) : null}
    </>
  );
}
