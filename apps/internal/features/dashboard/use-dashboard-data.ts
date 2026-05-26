import { useAuth } from "@/lib/auth/auth";
import {
  defaultInternalDashboardStats,
  defaultInternalDashboardTrends,
  useInternalDashboardClinics,
  useInternalDashboardStats,
} from "@workspace/data-access/internal";
import { getUserFacingErrorMessage } from "@workspace/utils";

export function useDashboardData() {
  const { token } = useAuth();

  const clinicsQuery = useInternalDashboardClinics(token);
  const statsQuery = useInternalDashboardStats(token);

  const hasError = Boolean(clinicsQuery.error ?? statsQuery.error);
  const errorSource = clinicsQuery.error ?? statsQuery.error ?? null;
  const errorMessage = errorSource
    ? getUserFacingErrorMessage(errorSource, {
        context: "load",
        fallback:
          "We could not load this dashboard. Please refresh and try again.",
      })
    : "We could not load this dashboard. Please refresh and try again.";

  return {
    token,
    clinics: clinicsQuery.data ?? [],
    stats: statsQuery.data ?? defaultInternalDashboardStats,
    trends: statsQuery.data?.trends ?? defaultInternalDashboardTrends,
    loading: Boolean(token) && (clinicsQuery.isLoading || statsQuery.isLoading),
    hasError,
    errorMessage,
    refetch: async () => {
      await Promise.all([clinicsQuery.refetch(), statsQuery.refetch()]);
    },
  };
}
