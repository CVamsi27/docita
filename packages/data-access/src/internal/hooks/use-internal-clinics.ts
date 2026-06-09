import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type { InternalDashboardClinic } from "../dashboard.types";
import { normalizeClinicsList } from "../lib/normalize-clinics-list";

type ClinicsScope = "dashboard" | "users" | "list";

function clinicsQueryKey(
  scope: ClinicsScope,
  token: string | null | undefined,
) {
  switch (scope) {
    case "dashboard":
      return internalQueryKeys.internal.dashboardClinics(token);
    case "users":
      return internalQueryKeys.internal.usersClinics(token);
    default:
      return internalQueryKeys.internal.clinics();
  }
}

export function useInternalClinics(
  token: string | null | undefined,
  scope: ClinicsScope = "list",
  options?: Omit<
    UseQueryOptions<InternalDashboardClinic[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
// jscpd:ignore-start
    queryKey: clinicsQueryKey(scope, token),
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
