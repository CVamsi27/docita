import { useMemo, type ReactNode } from "react";
import {
  DataAccessProvider,
  type DataAccessConfig,
} from "@workspace/data-access";
import { parseFeature } from "@/lib/access-control/parse-feature";
import { fetchAPI } from "@/lib/api/api-core";
import { useOptionalAuth } from "@/lib/auth/auth-context";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { usePermissionStore } from "@/lib/stores/permission-store";

/**
 * Inject session-aware transport and workspace context. Permission updates must
 * refresh the provider config so gated queries re-evaluate after hydration or
 * access changes.
 */
export function DataAccessBridge({ children }: { children: ReactNode }) {
  const permissionState = usePermissionStore();
  const clinicCtx = useOptionalClinic();
  const auth = useOptionalAuth();
  const sessionClinicId = auth?.user?.clinicId ?? undefined;
  const clinicId =
    clinicCtx?.clinic?.id ??
    clinicCtx?.clinicId ??
    sessionClinicId ??
    undefined;
  const clinicTimezone = clinicCtx?.clinic?.timezone ?? undefined;

  const config = useMemo<DataAccessConfig>(
    () => ({
      fetcher: fetchAPI,
      getClinicId: () => clinicId,
      getClinicTimezone: () => clinicTimezone,
      isTierFeatureEnabled: (feature: string) => {
        const parsed = parseFeature(feature);
        return parsed ? permissionState.canAccess(parsed) : false;
      },
    }),
    [clinicId, clinicTimezone, permissionState],
  );

  return <DataAccessProvider config={config}>{children}</DataAccessProvider>;
}
