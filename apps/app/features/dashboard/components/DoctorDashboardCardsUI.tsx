"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronRight, Clock, Play, Stethoscope, Users } from "lucide-react";

import { DashboardAppointment } from "@workspace/types";

interface QueueStats {
  waiting: number;
  inProgress: number;
  completed: number;
  total: number;
}

interface DoctorDashboardCardsProps {
  currentPatient?: DashboardAppointment | null;
  nextPatients: DashboardAppointment[];
  queueStats: QueueStats;
  estimatedWaitTime: number;
}

export function DoctorDashboardCardsUI({
  currentPatient,
  nextPatients,
  queueStats,
  estimatedWaitTime,
}: DoctorDashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Current Patient Card */}
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {currentPatient ? "Current Patient" : "No Active Session"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {currentPatient
                    ? "In consultation"
                    : "Start your next patient"}
                </p>
              </div>
            </div>
            {currentPatient && (
              <Badge variant="default" className="bg-primary animate-pulse">
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentPatient ? (
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-linear-to-br from-primary/30 to-primary/10 text-primary text-lg font-medium">
                  {currentPatient.patient?.firstName?.[0]}
                  {currentPatient.patient?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-xl font-semibold">
                  {currentPatient.patient?.firstName}{" "}
                  {currentPatient.patient?.lastName}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {currentPatient.type?.replace(/_/g, " ").toLowerCase()} •{" "}
                  {format(new Date(currentPatient.startTime), "h:mm a")}
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="gap-2 shadow-lg shadow-primary/20"
              >
                <Link href={`/consultation/${currentPatient.id}`}>
                  <Play className="h-4 w-4" />
                  Continue
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between py-4">
              <p className="text-muted-foreground">
                {nextPatients.length > 0
                  ? `${nextPatients.length} patient(s) waiting`
                  : "No patients in queue"}
              </p>
              {nextPatients.length > 0 && nextPatients[0] && (
                <Button asChild variant="default" className="gap-2">
                  <Link href={`/consultation/${nextPatients[0].id}`}>
                    Start Next Patient
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Status Card */}
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Queue Status
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {estimatedWaitTime > 0
                  ? `~${estimatedWaitTime} min wait`
                  : "Queue is empty"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20">
              <p className="text-2xl font-bold text-amber-600">
                {queueStats.waiting}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Waiting
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20">
              <p className="text-2xl font-bold text-blue-600">
                {queueStats.inProgress}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Active
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20">
              <p className="text-2xl font-bold text-green-600">
                {queueStats.completed}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Done
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Today&apos;s Progress</span>
              <span>
                {queueStats.completed}/{queueStats.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-all duration-500"
                )}
                style={{
                  width: `${queueStats.total > 0 ? (queueStats.completed / queueStats.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <Button asChild variant="ghost" className="w-full mt-4" size="sm">
            <Link href="/queue">
              <Clock className="h-4 w-4 mr-2" />
              View Full Queue
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Export alias for backward compatibility
export { DoctorDashboardCardsUI as DoctorDashboardCards };
