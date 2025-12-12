"use client";

import { useMemo } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { usePermissionStore, Feature } from "@/lib/stores/permission-store";
import { cn } from "@workspace/ui/lib/utils";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardStatsGrid } from "@/components/dashboard/dashboard-stats-grid";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { RecentPatients } from "@/components/dashboard/recent-patients";
import { DailyProgress } from "@/components/dashboard/daily-progress";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// Define generic interface for Appointment since the API hook might return various shapes
// This aligns with what TodaySchedule expects
interface Patient {
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  startTime: string | Date;
  status: "scheduled" | "completed" | "in-progress" | "cancelled" | "no-show";
  type: string;
  patient: Patient;
}

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

interface PatientListItem extends Patient {
  id: string;
  email?: string;
  bloodGroup?: string;
  updatedAt?: string;
  tags?: Array<{ id: string; tag: string; color: string }>;
}

interface AppointmentListItem extends Appointment {
  notes?: string;
  createdAt?: string;
}

export default function DashboardPage() {
  const { canAccess } = usePermissionStore();

  // ✅ OPTIMIZATION: All hooks run in parallel automatically via React Query
  const { data, isLoading: loading } = apiHooks.useDashboardStats();
  const { data: rawAppointmentsResponse } = apiHooks.useTodayAppointments();
  const { data: recentPatientsResponse } = apiHooks.useRecentPatients(5);

  const stats = useMemo(
    () => ({
      totalPatients: data?.totalPatients ?? 0,
      todayAppointments: data?.todayAppointments ?? 0,
      activePrescriptions: data?.activePrescriptions ?? 0,
      pendingReports: data?.pendingReports ?? 0,
      newPatientsThisMonth: data?.newPatientsThisMonth ?? 0,
    }),
    [data],
  );

  // ✅ OPTIMIZATION: Memoize filtered patients
  const castRecentPatients = useMemo(() => {
    const paginatedResponse =
      recentPatientsResponse as unknown as PaginatedResponse<PatientListItem>;
    const patients = paginatedResponse?.items || [];
    return patients.filter(
      (p): p is PatientListItem & { id: string } => !!(p && p.id),
    );
  }, [recentPatientsResponse]);

  // ✅ OPTIMIZATION: Memoize sorted appointments and computed values
  const { todayAppointments, completedToday, inProgressToday } = useMemo(() => {
    // Extract items from paginated response
    const paginatedResponse =
      rawAppointmentsResponse as unknown as PaginatedResponse<AppointmentListItem>;
    const appointmentsData = paginatedResponse?.items || [];

    const sorted = [...appointmentsData].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    return {
      todayAppointments: sorted,
      completedToday: sorted.filter((a) => a.status === "completed").length,
      inProgressToday: sorted.filter((a) => a.status === "in-progress").length,
    };
  }, [rawAppointmentsResponse]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <DashboardHeader />

        <DashboardQuickActions pendingReports={stats.pendingReports} />

        <DashboardStatsGrid
          stats={stats}
          completedToday={completedToday}
          inProgressToday={inProgressToday}
        />

        {/* Main Content */}
        <div
          className={cn(
            "grid gap-6",
            canAccess(Feature.CALENDAR_SLOTS)
              ? "lg:grid-cols-3"
              : "lg:grid-cols-1",
          )}
        >
          {/* Schedule Section */}
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <TodaySchedule appointments={todayAppointments} />
          )}

          {/* Right Column */}
          <div className="space-y-6">
            <RecentPatients patients={castRecentPatients} />

            <DailyProgress
              completedToday={completedToday}
              totalAppointments={todayAppointments.length}
              pendingReports={stats.pendingReports}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
