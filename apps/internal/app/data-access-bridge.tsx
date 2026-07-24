"use client";

import { type ReactNode, useMemo } from "react";
import { type DataAccessConfig, DataAccessProvider, type RequestConfig } from "@workspace/data-access";
import { client } from "@/lib/api/api-client";

export function InternalDataAccessBridge({ children }: { children: ReactNode }) {
  const config = useMemo<DataAccessConfig>(
    () => ({
      fetcher: <T,>(endpoint: string, options?: RequestConfig) =>
        client.request<T>(endpoint, options),
      getClinicId: () => undefined,
      getClinicTimezone: () => undefined,
      isTierFeatureEnabled: () => true,
    }),
    [],
  );

  return <DataAccessProvider config={config}>{children}</DataAccessProvider>;
}
