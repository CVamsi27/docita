import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type { InternalAdminUser } from "../admins.types";

export function useInternalClinicAdmins(
  token: string | null | undefined,
  clinicId: string,
  options?: Omit<
    UseQueryOptions<InternalAdminUser[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.clinicAdmins(clinicId || "none"),
    queryFn: () =>
      fetcher<InternalAdminUser[]>(`/internal/clinics/${clinicId}/admins`),
    enabled: Boolean(token && clinicId && clinicId !== "all"),
    ...options,
  });
}
