import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import { DailyProgressUI, DailyProgressUIProps } from "./DailyProgressUI";

interface DailyProgressContainerProps extends DailyProgressUIProps {}

export function DailyProgressContainer(props: DailyProgressContainerProps) {
  const { canAccess } = usePermissionStore();

  if (!canAccess(Feature.CALENDAR_SLOTS)) {
    return null;
  }

  return <DailyProgressUI {...props} />;
}
