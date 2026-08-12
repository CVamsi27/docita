import { useMemo, useState } from "react";
import {
  useInsuranceClaims,
  type InsuranceClaimFilters,
} from "@workspace/data-access";
import type { InsuranceClaim } from "@workspace/types";

/** Drives the clinic-wide claims list: status filter + free-text search. */
export const useInsuranceClaimsLogic = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filters: InsuranceClaimFilters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery.trim() || undefined,
      limit: 50,
    }),
    [statusFilter, searchQuery],
  );

  const { data, isPending, isError, error, refetch } =
    useInsuranceClaims(filters);

  const claims: InsuranceClaim[] = data?.items ?? [];

  return {
    claims,
    loading: isPending,
    isError,
    error,
    refetch,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
  };
};
