import { useAuth } from "@/lib/auth/auth";
import {
  defaultInternalDashboardStats,
  defaultInternalDashboardTrends,
  useInternalDashboardClinics,
  useInternalDashboardStats,
} from "@workspace/data-access/internal";
export function useDashboardData() {
  const { token } = useAuth();

  const clinicsQuery = useInternalDashboardClinics(token);
  const statsQuery = useInternalDashboardStats(token);

  return {
    token,
    clinics: clinicsQuery.data ?? [],
    stats: statsQuery.data ?? defaultInternalDashboardStats,
    trends: statsQuery.data?.trends ?? defaultInternalDashboardTrends,
    loading: Boolean(token) && (clinicsQuery.isLoading || statsQuery.isLoading),
    refetch: async () => {
      await Promise.all([clinicsQuery.refetch(), statsQuery.refetch()]);
    },
  };
}
