"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/indicators/avatar";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { LiveDot } from "@workspace/ui/components/indicators/live-dot";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import { cn } from "@workspace/ui/lib/utils";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { Clock, Play, Stethoscope, Users } from "lucide-react";

import type { AppointmentListItem } from "@workspace/data-access";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface QueueStats {
  waiting: number;
  inProgress: number;
  completed: number;
  total: number;
}

interface DoctorDashboardCardsProps {
  currentPatient?: AppointmentListItem | null;
  nextPatients: AppointmentListItem[];
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
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <Card className="border border-border shadow-sm bg-card md:col-span-2 lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="min-w-0">
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
              <Badge className="badge-info w-fit border px-2.5 py-0.5 font-medium">
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentPatient ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-14 sm:w-14 shrink-0">
                <AvatarFallback className="border border-border/70 bg-background/70 text-foreground text-base sm:text-lg font-medium">
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
                  {humanizeUiLabel(currentPatient.type)} •{" "}
                  {formatTime(currentPatient.startTime, "h:mm a")}
                </p>
              </div>
              <Button
                size="default"
                className="w-full gap-2 sm:w-auto sm:shrink-0"
                onClick={() =>
                  router.push(`/consultation/${currentPatient.id}`)
                }
              >
                <Play className="h-4 w-4" />
                Continue
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                {nextPatients.length > 0
                  ? `${nextPatients.length} patient(s) waiting`
                  : "No patients in queue"}
              </p>
              {nextPatients.length > 0 && nextPatients[0] && (
                <Button
                  size="default"
                  className="w-full gap-2 sm:w-auto sm:shrink-0"
                  disabled={startConsultation.isPending}
                  onClick={() =>
                    void handleStartAppointment(nextPatients[0].id)
                  }
                >
                  <Play className="h-4 w-4" />
                  {startingAppointmentId === nextPatients[0].id
                    ? "Starting…"
                    : "Start Next Patient"}
                </Button>
              )}
            </div>
          )}

          {nextPatients.length > 0 ? (
            <ListRowGroup className="mt-4 md:hidden">
              {nextPatients.slice(0, 5).map((appt, index) => {
                const name = appt.patient
                  ? `${appt.patient.firstName} ${appt.patient.lastName}`.trim()
                  : "Patient";
                return (
                  <ListRow
                    key={appt.id}
                    token={String(index + 1).padStart(2, "0")}
                    title={name}
                    meta={humanizeUiLabel(appt.type)}
                    time={formatTime(appt.startTime, "h:mm a")}
                    status="waiting"
                    statusLabel="Waiting"
                    onClick={() => void handleStartAppointment(appt.id)}
                  />
                );
              })}
            </ListRowGroup>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-info">
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
            <div className="p-3 rounded-[var(--radius)] bg-warning/10 flex flex-col justify-center items-center">
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums text-warning">
                {queueStats.waiting}
              </p>
              <p className="max-w-full text-[length:var(--fs-2xs)] uppercase text-muted-foreground sm:text-xs">
                Waiting
              </p>
            </div>
            <div className="p-3 rounded-[var(--radius)] bg-info/10 flex flex-col justify-center items-center">
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums text-info">
                {queueStats.inProgress}
              </p>
              <p className="flex max-w-full items-center justify-center gap-1 text-[length:var(--fs-2xs)] uppercase text-muted-foreground sm:gap-1.5 sm:text-xs">
                {queueStats.inProgress > 0 ? (
                  <LiveDot tone="cyan" ariaLabel="Active consultation" />
                ) : null}
                <span>Active</span>
              </p>
            </div>
            <div className="p-3 rounded-[var(--radius)] bg-success/10 flex flex-col justify-center items-center">
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums text-success">
                {queueStats.completed}
              </p>
              <p className="max-w-full text-[length:var(--fs-2xs)] uppercase text-muted-foreground sm:text-xs">
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
