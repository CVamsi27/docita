"use client";

import { FC } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { CheckCircle2, Clock, Play, Users } from "lucide-react";

interface QueueStatsData {
  waiting: number;
  inProgress: number;
  completed: number;
  avgWaitTime: number;
}

interface QueueStatsProps {
  stats?: QueueStatsData | null;
}

export const QueueStats: FC<QueueStatsProps> = ({ stats }) => {
  const formatWaitTime = (minutes?: number) => {
    if (!minutes) return "0m";
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="border-none shadow-lg bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <Clock className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {stats?.waiting ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Waiting</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-lg bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <Play className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {stats?.inProgress ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-lg bg-green-50 dark:bg-green-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {stats?.completed ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-lg bg-purple-50 dark:bg-purple-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <Users className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {formatWaitTime(stats?.avgWaitTime)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Wait</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export type { QueueStatsData, QueueStatsProps };
