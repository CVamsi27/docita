import { DashboardStats } from "@workspace/types";
import { useAPIQuery } from "../core/use-api-query";

export const useDashboardStats = () =>
  useAPIQuery<DashboardStats>(["dashboard-stats"], "/dashboard/stats", {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
