"use client";

import { useMemo, type ReactNode } from "react";
import {
  DataAccessProvider,
  type DataAccessConfig,
} from "@workspace/data-access";
import { Feature } from "@workspace/types";
import { fetchAPI } from "@/lib/api/api-core";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { usePermissionStore } from "@/lib/stores/permission-store";

export function DataAccessBridge({ children }: { children: ReactNode }) {
  const clinicCtx = useOptionalClinic();
  const clinicId = clinicCtx?.clinic?.id;
  const clinicTimezone = clinicCtx?.clinic?.timezone ?? undefined;

  const config = useMemo<DataAccessConfig>(
    () => ({
      fetcher: fetchAPI,
      getClinicId: () => clinicId,
      getClinicTimezone: () => clinicTimezone,
      isTierFeatureEnabled: (feature: string) =>
        usePermissionStore.getState().canAccess(feature as Feature),
    }),
    [clinicId, clinicTimezone],
  );

  return <DataAccessProvider config={config}>{children}</DataAccessProvider>;
}
