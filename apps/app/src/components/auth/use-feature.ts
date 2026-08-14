import { Feature } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";

export function useFeature(feature: Feature): boolean {
  const { canAccess } = usePermissionStore();
  return canAccess(feature);
}
