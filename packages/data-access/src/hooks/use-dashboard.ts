import { DashboardStats } from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIQuery } from "../core/use-api-query";

export const useDashboardStats = () =>
  useAPIQuery<DashboardStats>(queryKeys.dashboard.stats(), "/dashboard/stats", {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
