import { useAuth } from "@/lib/auth/auth";
import {
  defaultInternalDashboardStats,
  defaultInternalDashboardTrends,
  useInternalDashboardClinics,
  useInternalDashboardStats,
} from "@workspace/data-access/internal";
import type { DashboardClinic } from "./types";

export function useDashboardData() {
  const { token } = useAuth();

  const clinicsQuery = useInternalDashboardClinics(token);
  const statsQuery = useInternalDashboardStats(token);

  return {
    token,
    clinics: (clinicsQuery.data ?? []) as DashboardClinic[],
    stats: statsQuery.data ?? defaultInternalDashboardStats,
    trends: statsQuery.data?.trends ?? defaultInternalDashboardTrends,
    loading: Boolean(token) && (clinicsQuery.isLoading || statsQuery.isLoading),
    refetch: async () => {
      await Promise.all([clinicsQuery.refetch(), statsQuery.refetch()]);
    },
  };
}
