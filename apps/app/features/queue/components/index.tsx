"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";

// Type definitions
interface QueueStats {
  waiting: number;
  inProgress: number;
  completed: number;
  noShow?: number;
  avgWaitTime?: number;
}

interface QueueItem {
  id: string;
  patientName?: string;
  patientId?: string;
  appointmentId?: string;
  checkInTime?: string;
  status: "waiting" | "in-progress" | "completed" | "no-show" | "cancelled";
  priority?: "normal" | "urgent" | "emergency";
}

interface QueueDashboardProps {
  stats?: QueueStats;
  queue?: QueueItem[];
}

export const QueueDashboard: FC<QueueDashboardProps> = ({
  stats,
  queue = [],
}) => {
  return (
    <div className="space-y-6">
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
                {queue.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Queue</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No patients in queue
            </p>
          ) : (
            <div className="space-y-2">
              {queue.map((item, i) => (
                <div
                  key={item.id || i}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {item.patientName ?? "Patient"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.checkInTime ?? "Just now"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        item.status === "in-progress" ? "default" : "outline"
                      }
                      className="capitalize"
                    >
                      {item.status ?? "waiting"}
                    </Badge>
                    <Button size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Export types for use elsewhere
export type { QueueStats, QueueItem, QueueDashboardProps };
