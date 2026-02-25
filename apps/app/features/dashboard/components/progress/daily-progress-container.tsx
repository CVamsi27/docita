import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import { DailyProgressUI, DailyProgressUIProps } from "./daily-progress-ui";

export function DailyProgressContainer(props: DailyProgressUIProps) {
  const { canAccess } = usePermissionStore();

  if (!canAccess(Feature.CALENDAR_SLOTS)) {
    return null;
  }

  return <DailyProgressUI {...props} />;
}
