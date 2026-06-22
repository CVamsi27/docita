"use client";

import { useMemo } from "react";
import { dashboardStatsSchema, type DashboardStats } from "@workspace/types";
import { useClinicMembers, useDashboardStats } from "@workspace/data-access";
import { useClinic } from "@/lib/contexts/clinic-context";
import { isClinicProfileComplete } from "@/features/guided-tour/lib/is-clinic-profile-complete";

export type ChecklistSignals = Record<string, boolean>;

/**
 * Maps each checklist item id to its live completion signal, derived from data
 * the app already exposes (dashboard stats, clinic members, clinic profile) —
 * no new counters. Fetches only run while the checklist is mounted, and share
 * React Query's cache with the rest of `/today`.
 */
export function useChecklistSignals(): {
  signals: ChecklistSignals;
  isLoading: boolean;
} {
  const { data: rawStats, isLoading: statsLoading } = useDashboardStats();
  const { data: members, isLoading: membersLoading } = useClinicMembers();
  const { clinic } = useClinic();

  const stats = useMemo<DashboardStats | null>(() => {
    const parsed = dashboardStatsSchema.safeParse(rawStats);
    return parsed.success ? parsed.data : null;
  }, [rawStats]);

  const signals = useMemo<ChecklistSignals>(
    () => ({
      "add-patient": (stats?.totalPatients ?? 0) > 0,
      "book-appointment":
        (stats?.totalAppointments ?? 0) > 0 ||
        (stats?.todayAppointments ?? 0) > 0,
      "invite-team": (members?.length ?? 0) > 1,
      "complete-profile": isClinicProfileComplete(clinic),
    }),
    [stats, members, clinic],
  );

  return { signals, isLoading: statsLoading || membersLoading };
}
