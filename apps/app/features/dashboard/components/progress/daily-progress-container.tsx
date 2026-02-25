import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import { DailyProgressUI, DailyProgressUIProps } from "./DailyProgressUI";

export function DailyProgressContainer(props: DailyProgressUIProps) {
  const { canAccess } = usePermissionStore();

  if (!canAccess(Feature.CALENDAR_SLOTS)) {
    return null;
  }

  return <DailyProgressUI {...props} />;
}
