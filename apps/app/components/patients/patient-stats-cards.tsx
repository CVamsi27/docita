"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Activity, Calendar, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Appointment } from "@workspace/types";

interface PatientStatsCardsProps {
  appointments: Appointment[];
  lastVisit?: Date;
  nextVisit?: Date;
}

export function PatientStatsCards({
  appointments,
  lastVisit,
  nextVisit,
}: PatientStatsCardsProps) {
  const completedVisits = appointments.filter(
    (a) => a.status === "completed",
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-500/10 to-blue-500/5 shadow-sm transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Visits
              </p>
              <h3 className="text-2xl font-bold">{completedVisits}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none bg-gradient-to-br from-green-500/10 to-green-500/5 shadow-sm transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Visit
              </p>
              <h3 className="text-lg font-bold">
                {lastVisit
                  ? formatDistanceToNow(new Date(lastVisit), {
                      addSuffix: true,
                    })
                  : "Never"}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none bg-gradient-to-br from-purple-500/10 to-purple-500/5 shadow-sm transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Next Visit
              </p>
              <h3 className="text-lg font-bold">
                {nextVisit
                  ? formatDistanceToNow(new Date(nextVisit), {
                      addSuffix: true,
                    })
                  : "None"}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none bg-gradient-to-br from-orange-500/10 to-orange-500/5 shadow-sm transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Adherence
              </p>
              <h3 className="text-2xl font-bold">
                {appointments.length > 0
                  ? `${Math.round((completedVisits / appointments.length) * 100)}%`
                  : "N/A"}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
