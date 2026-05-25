import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys";
import { useDataAccessFetcher } from "../../provider/hooks";
import { loadInternalUsersForSelection } from "../lib/load-internal-users";
import type { InternalClinicSummary, InternalPortalUser } from "../users.types";

export function useInternalUsersList(
  token: string | null | undefined,
  selectedClinic: string,
  clinics: InternalClinicSummary[],
  options?: Omit<
    UseQueryOptions<InternalPortalUser[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.usersList(
      token,
      selectedClinic,
      clinics.length,
    ),
    queryFn: () => loadInternalUsersForSelection(fetcher, selectedClinic, clinics),
    enabled:
      Boolean(token) &&
      Boolean(selectedClinic) &&
      (selectedClinic === "all" ? clinics.length > 0 : true),
    ...options,
  });
}
