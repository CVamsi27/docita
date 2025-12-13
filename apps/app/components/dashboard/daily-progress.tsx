"use client";

import { Sparkles, Zap } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";

interface DailyProgressProps {
  completedToday: number;
  totalAppointments: number;
  pendingReports: number;
}

export function DailyProgress({
  completedToday,
  totalAppointments,
  pendingReports,
}: DailyProgressProps) {
  const { canAccess } = usePermissionStore();

  if (!canAccess(Feature.CALENDAR_SLOTS)) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="font-medium text-sm">Today&apos;s Progress</p>
        </div>

        <div className="space-y-3">
          {/* Completion Rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Appointments</span>
              <span className="font-medium">
                {completedToday}/{totalAppointments}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                style={{
                  width: `${
                    totalAppointments > 0
                      ? (completedToday / totalAppointments) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Quick stat */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-yellow-600" />
              <span className="text-xs text-muted-foreground">
                Pending codes
              </span>
            </div>
            <Badge
              variant={pendingReports > 0 ? "secondary" : "outline"}
              className="text-[10px] h-5"
            >
              {pendingReports}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
