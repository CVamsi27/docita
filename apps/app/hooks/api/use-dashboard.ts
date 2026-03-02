import { DashboardStats } from "@workspace/types";
import { useAPIQuery } from "@/lib/api-core";

export const useDashboardStats = () =>
  useAPIQuery<DashboardStats>(["dashboard-stats"], "/dashboard/stats");
