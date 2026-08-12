import { useTranslation } from "react-i18next";
import { StatGrid, type StatItem } from "@workspace/ui/components/data-display/stat-grid";
import { formatCountLocale } from "@workspace/utils";
import { CalendarCheck2, CheckCircle2, Clock, Users } from "lucide-react";

interface DashboardStatsGridProps {
  stats: {
    totalPatients: number;
    todayAppointments: number;
    activePrescriptions: number;
    newPatientsThisMonth?: number;
  };
  completedToday: number;
  inProgressToday: number;
}

export function DashboardStatsGrid({
  stats,
  completedToday,
  inProgressToday,
}: DashboardStatsGridProps) {
  const { t } = useTranslation("Dashboard");
  const items: StatItem[] = [
    {
      id: "patients",
      label: t("stats.totalPatients"),
      value: formatCountLocale(stats.totalPatients),
      icon: <Users className="size-4" aria-hidden />,
      accent: "info",
    },
    {
      id: "today-appointments",
      label: t("stats.todayAppointments"),
      value: formatCountLocale(stats.todayAppointments),
      icon: <CalendarCheck2 className="size-4" aria-hidden />,
      accent: "warning",
    },
    {
      id: "completed-today",
      label: t("stats.completedToday"),
      value: formatCountLocale(completedToday),
      icon: <CheckCircle2 className="size-4" aria-hidden />,
      accent: "success",
    },
    {
      id: "in-progress",
      label: t("stats.inProgress"),
      value: formatCountLocale(inProgressToday),
      icon: <Clock className="size-4" aria-hidden />,
      accent: "default",
    },
  ];

  return <StatGrid items={items} columns={4} />;
}