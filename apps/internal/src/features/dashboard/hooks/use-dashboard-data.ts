import { useQuery } from "@tanstack/react-query";
import {
  internalClinicListResponseSchema,
  internalDashboardStatsSchema,
} from "@workspace/types";
import { apiGet } from "@/lib/api/api-client";

export function useDashboardData(cursor?: string) {
  const clinicsPath = `/api/internal/clinics?${new URLSearchParams({ limit: "50", ...(cursor ? { cursor } : {}) })}`;
  const clinics = useQuery({
    queryKey: ["internal", clinicsPath],
    queryFn: async () =>
      internalClinicListResponseSchema.parse(
        await apiGet<unknown>(clinicsPath),
      ),
  });
  const stats = useQuery({
    queryKey: ["internal", "/api/internal/stats"],
    queryFn: async () =>
      internalDashboardStatsSchema.parse(
        await apiGet<unknown>("/api/internal/stats"),
      ),
  });
  return { clinics, stats };
}
