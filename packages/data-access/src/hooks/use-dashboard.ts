import { DashboardStats } from "@workspace/types";
import { QUERY_STALE_TIMES } from "../lib/query-stale-times";
import { queryKeys } from "../lib/query-keys";
import { useAPIQuery } from "../core/use-api-query";

export const useDashboardStats = () =>
  useAPIQuery<DashboardStats>(queryKeys.dashboard.stats(), "/dashboard/stats", {
    staleTime: QUERY_STALE_TIMES.dashboard,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  });
