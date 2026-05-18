import { useAuth } from "@/lib/auth/auth";
import { useInternalQuery } from "@/lib/api/use-internal-query";
import { fetchDashboardClinics, fetchDashboardStats } from "./api";
import {
  type DashboardClinic,
  defaultDashboardStats,
  defaultDashboardTrends,
} from "./types";

export function useDashboardData() {
  const { token } = useAuth();

  const clinicsQuery = useInternalQuery({
    queryKey: ["internal", "dashboard", "clinics", token] as const,
    queryFn: fetchDashboardClinics,
  });

  const statsQuery = useInternalQuery({
    queryKey: ["internal", "dashboard", "stats", token] as const,
    queryFn: fetchDashboardStats,
  });

  return {
    token,
    clinics: (clinicsQuery.data ?? []) as DashboardClinic[],
    stats: statsQuery.data ?? defaultDashboardStats,
    trends: statsQuery.data?.trends ?? defaultDashboardTrends,
    loading: Boolean(token) && (clinicsQuery.isLoading || statsQuery.isLoading),
    refetch: async () => {
      await Promise.all([clinicsQuery.refetch(), statsQuery.refetch()]);
    },
  };
}
