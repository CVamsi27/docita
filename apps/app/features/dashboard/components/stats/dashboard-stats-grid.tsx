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
      color: "text-info",
      bgColor: "from-info/20 to-info/10",
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: CalendarCheck2,
      color: "text-warning",
      bgColor: "from-warning/20 to-warning/10",
    },
    {
      title: "Completed Today",
      value: completedToday,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "from-success/20 to-success/10",
    },
    {
      title: "Active",
      value: inProgressToday,
      icon: Clock,
      color: "text-primary",
      bgColor: "from-primary/20 to-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="border border-border bg-card shadow-sm transition-colors duration-150 hover:shadow-md"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
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

export { DashboardStatsGridUI as DashboardStatsGrid };
