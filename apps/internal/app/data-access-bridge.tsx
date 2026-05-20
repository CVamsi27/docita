"use client";

import { useMemo, type ReactNode } from "react";
import {
  DataAccessProvider,
  type DataAccessConfig,
  type RequestConfig,
} from "@workspace/data-access";
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
