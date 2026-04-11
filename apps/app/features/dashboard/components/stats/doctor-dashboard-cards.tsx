"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Clock, Play, Stethoscope, Users } from "lucide-react";

import { DashboardAppointment } from "@workspace/types";
import { useStartConsultation } from "@/hooks/api/use-appointments";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

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
  const router = useRouter();
  const startConsultation = useStartConsultation();
  const [startingAppointmentId, setStartingAppointmentId] = useState<
    string | null
  >(null);

  const handleStartAppointment = async (appointmentId: string) => {
    try {
      setStartingAppointmentId(appointmentId);
      const result = await startConsultation.mutateAsync({ appointmentId });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not open this consultation. Please try again.",
        "save",
      );
    } finally {
      setStartingAppointmentId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="border border-border shadow-sm bg-card md:col-span-2 lg:col-span-2">
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
              <Badge variant="default" className="bg-primary">
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentPatient ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-14 sm:w-14 shrink-0">
                <AvatarFallback className="bg-linear-to-br from-primary/30 to-primary/10 text-primary text-base sm:text-lg font-medium">
                  {currentPatient.patient?.firstName?.[0]}
                  {currentPatient.patient?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-base sm:text-xl font-semibold truncate">
                  {currentPatient.patient?.firstName}{" "}
                  {currentPatient.patient?.lastName}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  {currentPatient.type?.replace(/_/g, " ").toLowerCase()} •{" "}
                  {format(new Date(currentPatient.startTime), "h:mm a")}
                </p>
              </div>
              <Button
                size="default"
                className="gap-2 shadow-sm shadow-primary/20 shrink-0"
                onClick={() => router.push(`/consultation/${currentPatient.id}`)}
              >
                <Play className="h-4 w-4" />
                Continue
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                {nextPatients.length > 0
                  ? `${nextPatients.length} patient(s) waiting`
                  : "No patients in queue"}
              </p>
              {nextPatients.length > 0 && nextPatients[0] && (
                <Button
                  size="default"
                  className="gap-2 shrink-0"
                  disabled={startConsultation.isPending}
                  onClick={() => void handleStartAppointment(nextPatients[0].id)}
                >
                  <Play className="h-4 w-4" />
                  {startingAppointmentId === nextPatients[0].id
                    ? "Starting..."
                    : "Start Next Patient"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-info/20 to-info/10 flex items-center justify-center text-info">
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
            <div className="p-3 rounded-xl bg-warning/10">
              <p className="text-2xl font-bold text-warning">
                {queueStats.waiting}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Waiting
              </p>
            </div>
            <div className="p-3 rounded-xl bg-info/10">
              <p className="text-2xl font-bold text-info">
                {queueStats.inProgress}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Active
              </p>
            </div>
            <div className="p-3 rounded-xl bg-success/10">
              <p className="text-2xl font-bold text-success">
                {queueStats.completed}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Done
              </p>
            </div>
          </div>

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
                  "h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-colors duration-150",
                )}
                style={{
                  width: `${Math.min(Math.max(queueStats.total > 0 ? (queueStats.completed / queueStats.total) * 100 : 0, 0), 100)}%`,
                }}
              />
            </div>
          </div>

          <Button asChild variant="ghost" className="w-full mt-4" size="sm">
            <Link href="/consultation">
              <Clock className="h-4 w-4 mr-2" />
              View Full Queue
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export { DoctorDashboardCardsUI as DoctorDashboardCards };
