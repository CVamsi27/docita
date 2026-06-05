import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalDashboardClinic,
  InternalDashboardStats,
} from "../dashboard.types";
import { normalizeClinicsList } from "../lib/normalize-clinics-list";

export function useInternalDashboardClinics(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalDashboardClinic[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.dashboardClinics(token),
    queryFn: async () => {
      const data = await fetcher<
        InternalDashboardClinic[] | { items?: InternalDashboardClinic[] }
      >("/internal/clinics");
      return normalizeClinicsList(data);
    },
    enabled: Boolean(token),
    ...options,
  });
}

export function useInternalDashboardStats(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalDashboardStats, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.dashboardStats(token),
    queryFn: () => fetcher<InternalDashboardStats>("/internal/stats"),
    enabled: Boolean(token),
    refetchInterval: token ? 60_000 : false,
    refetchOnWindowFocus: Boolean(token),
    ...options,
  });
}
