import { createContext } from "react";
import type { RequestConfig } from "../lib/types";

export interface DataAccessConfig {
  fetcher: <T>(endpoint: string, options?: RequestConfig) => Promise<T>;
  getClinicId: () => string | undefined;
  getClinicTimezone: () => string | undefined;
  isTierFeatureEnabled: (feature: string) => boolean;
}

export const DataAccessContext = createContext<DataAccessConfig | null>(null);
