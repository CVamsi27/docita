"use client";

import { StatGrid, type StatItem } from "@workspace/ui/components/stat-grid";
import { CalendarCheck2, CheckCircle2, Clock, Users } from "lucide-react";

interface DashboardStatsGridProps {
  stats: {
    totalPatients: number;
    todayAppointments: number;
    activePrescriptions: number;
    pendingReports: number;
    newPatientsThisMonth?: number;
  };
  completedToday: number;
  inProgressToday: number;
}

export function DashboardStatsGridUI({
  stats,
  completedToday,
  inProgressToday,
}: DashboardStatsGridProps) {
  const items: StatItem[] = [
    {
      id: "patients",
      label: "Total patients",
      value: stats.totalPatients.toLocaleString(),
      icon: <Users className="size-4" aria-hidden />,
      accent: "info",
    },
    {
      id: "today-appointments",
      label: "Today's appointments",
      value: stats.todayAppointments.toLocaleString(),
      icon: <CalendarCheck2 className="size-4" aria-hidden />,
      accent: "warning",
    },
    {
      id: "completed-today",
      label: "Completed today",
      value: completedToday.toLocaleString(),
      icon: <CheckCircle2 className="size-4" aria-hidden />,
      accent: "success",
    },
    {
      id: "in-progress",
      label: "In progress",
      value: inProgressToday.toLocaleString(),
      icon: <Clock className="size-4" aria-hidden />,
      accent: "default",
    },
  ];

  return <StatGrid items={items} columns={4} />;
}

export { DashboardStatsGridUI as DashboardStatsGrid };
