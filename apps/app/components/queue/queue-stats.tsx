"use client";

import { Clock, Calendar, UserPlus, UserCheck, Timer } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

interface QueueStatsProps {
  stats:
    | {
        waiting: number;
        scheduled: number;
        walkIns: number;
        inProgress: number;
        avgWaitTime: number;
      }
    | undefined;
}

export function QueueStats({ stats }: QueueStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Waiting</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-500">
            {stats?.waiting ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">In waiting room</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          <Calendar className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-500">
            {stats?.scheduled ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">Appointments today</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Walk-ins</CardTitle>
          <UserPlus className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-500">
            {stats?.walkIns ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">Direct visits</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Consultation</CardTitle>
          <UserCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {stats?.inProgress ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">Being seen now</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Wait</CardTitle>
          <Timer className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">
            {stats?.avgWaitTime ? `${stats.avgWaitTime}m` : "-"}
          </div>
          <p className="text-xs text-muted-foreground">Wait time today</p>
        </CardContent>
      </Card>
    </div>
  );
}
