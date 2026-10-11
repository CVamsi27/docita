import { TodayFollowUpsPanel } from "@/features/dashboard/components/follow-ups/today-follow-ups-panel";
import { DashboardShortcutsSection } from "@/features/dashboard/components/layout/dashboard-shortcuts-section";
import { Feature } from "@/lib/stores/permission-store";

interface TodayMainWidgetsProps {
  uncodedVisits: number;
  canAccess: (feature: Feature) => boolean;
}

export function TodayMainWidgets({
  uncodedVisits,
  canAccess,
}: TodayMainWidgetsProps) {
  return (
    <>
      <TodayFollowUpsPanel enabled={canAccess(Feature.CALENDAR_SLOTS)} />
      <DashboardShortcutsSection uncodedVisits={uncodedVisits} />
    </>
  );
}
