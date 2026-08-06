import { useMemo, type ReactNode } from "react";
import { DataAccessProvider, type DataAccessConfig } from "@workspace/data-access";
import { parseFeature } from "@/lib/access-control/parse-feature";
import { fetchAPI } from "@/lib/api/api-core";
import { useOptionalAuth } from "@/lib/auth/auth-context";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { usePermissionStore } from "@/lib/stores/permission-store";

/**
 * Mounts the app glue the `@workspace/data-access` hooks need at runtime:
 * the session-aware fetcher, clinic identity/timezone, and the tier gate.
 * Ported from the legacy Next app (`apps/app/providers/data-access-bridge.tsx`)
 * which was dropped during the Vite cutover — without this mount every
 * data-access hook (`useAPIQuery` etc.) throws
 * "missing <DataAccessProvider>" and pages crash into the error boundary.
 */
export function DataAccessBridge({ children }: { children: ReactNode }) {
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
        return parsed ? usePermissionStore.getState().canAccess(parsed) : false;
      },
    }),
    [clinicId, clinicTimezone],
  );

  return <DataAccessProvider config={config}>{children}</DataAccessProvider>;
}
