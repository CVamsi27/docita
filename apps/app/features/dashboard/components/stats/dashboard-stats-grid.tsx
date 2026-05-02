"use client";

import { StatGrid, type StatItem } from "@workspace/ui/components/stat-grid";
import { formatCountLocale } from "@workspace/utils";
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
      value: formatCountLocale(stats.totalPatients),
      icon: <Users className="size-4" aria-hidden />,
      accent: "info",
    },
    {
      id: "today-appointments",
      label: "Today's appointments",
      value: formatCountLocale(stats.todayAppointments),
      icon: <CalendarCheck2 className="size-4" aria-hidden />,
      accent: "warning",
    },
    {
      id: "completed-today",
      label: "Completed today",
      value: formatCountLocale(completedToday),
      icon: <CheckCircle2 className="size-4" aria-hidden />,
      accent: "success",
    },
    {
      id: "in-progress",
      label: "In progress",
      value: formatCountLocale(inProgressToday),
      icon: <Clock className="size-4" aria-hidden />,
      accent: "default",
    },
  ];

  return <StatGrid items={items} columns={4} />;
}

export { DashboardStatsGridUI as DashboardStatsGrid };
