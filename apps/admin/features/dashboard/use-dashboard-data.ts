import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchDashboardClinics, fetchDashboardStats } from "./api";
import {
  type DashboardClinic,
  defaultDashboardStats,
  defaultDashboardTrends,
} from "./types";

export function useDashboardData() {
  const { token } = useAuth();

  const clinicsQuery = useQuery({
    queryKey: ["super-admin", "dashboard", "clinics", token],
    queryFn: fetchDashboardClinics,
    enabled: Boolean(token),
  });

  const statsQuery = useQuery({
    queryKey: ["super-admin", "dashboard", "stats", token],
    queryFn: fetchDashboardStats,
    enabled: Boolean(token),
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
