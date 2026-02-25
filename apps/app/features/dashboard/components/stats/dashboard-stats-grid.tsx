"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
  const cards = [
    {
      title: "Total Patients",
      value: stats.totalPatients,
      icon: Users,
      color: "text-blue-600",
      bgColor: "from-blue-500/20 to-blue-500/10",
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: CalendarCheck2,
      color: "text-amber-600",
      bgColor: "from-amber-500/20 to-amber-500/10",
    },
    {
      title: "Completed Today",
      value: completedToday,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "from-green-500/20 to-green-500/10",
    },
    {
      title: "In Progress",
      value: inProgressToday,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "from-purple-500/20 to-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="border-none shadow-lg bg-card/60 backdrop-blur-xl hover:shadow-xl transition-all"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div
                className={`h-8 w-8 rounded-xl bg-linear-to-br ${card.bgColor} flex items-center justify-center ${card.color}`}
              >
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Export alias for backward compatibility
export { DashboardStatsGridUI as DashboardStatsGrid };
