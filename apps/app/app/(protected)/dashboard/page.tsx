"use client";

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

export default function DashboardPage() {
  const { canAccess } = usePermissionStore();
  const { data, isLoading: loading } = apiHooks.useDashboardStats();
  // Cast the appointments data to our specific interface to ensure compatibility
  const { data: rawAppointments = [] } = apiHooks.useTodayAppointments();
  const appointments = rawAppointments as unknown as Appointment[];
  const { data: recentPatients = [] } = apiHooks.useRecentPatients(5);

  const stats = {
    totalPatients: data?.totalPatients ?? 0,
    todayAppointments: data?.todayAppointments ?? 0,
    activePrescriptions: data?.activePrescriptions ?? 0,
    pendingReports: data?.pendingReports ?? 0,
    newPatientsThisMonth: data?.newPatientsThisMonth ?? 0,
  };

  const castRecentPatients = (recentPatients || []).filter(
    (p): p is typeof p & { id: string } =>
      p && typeof p === "object" && "id" in p && !!p.id,
  );

  const todayAppointments = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const completedToday = todayAppointments.filter(
    (a) => a.status === "completed",
  ).length;
  const inProgressToday = todayAppointments.filter(
    (a) => a.status === "in-progress",
  ).length;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
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
