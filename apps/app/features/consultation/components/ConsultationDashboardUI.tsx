"use client";

import { FC, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Activity,
  Calendar,
  Clock,
  Play,
  Stethoscope,
  Users,
} from "lucide-react";
import { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { StatGrid } from "@workspace/ui/components/stat-grid";

export const ConsultationDashboardUI: FC = () => {
  const {
    activeConsultations,
    waitingList,
    stats,
    isLoading,
    handleStartConsultation,
    canStartConsultation,
    isStartingConsultation,
    router,
  } = useConsultationDashboard();

  const statItems = useMemo(
    () => [
      {
        id: "scheduled",
        label: "Scheduled Today",
        value: stats.scheduledToday,
        icon: <Calendar className="h-4 w-4" aria-hidden />,
      },
      {
        id: "waiting",
        label: "Waiting",
        value: stats.waiting,
        icon: <Users className="h-4 w-4" aria-hidden />,
      },
      {
        id: "active",
        label: "Active",
        value: stats.inProgress,
        icon: <Activity className="h-4 w-4" aria-hidden />,
      },
      {
        id: "completed",
        label: "Completed",
        value: stats.completed,
        icon: <Stethoscope className="h-4 w-4" aria-hidden />,
      },
    ],
    [stats],
  );

  if (isLoading) {
    return (
      <AppPageScaffold
        header={
          <PageHeader
            title="Consultation"
            description="Manage your daily consultations and patient queue"
          />
        }
      >
        <DataState
          status="loading"
          loadingMessage="Loading consultation dashboard..."
        />
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Consultation"
          description="Manage your daily consultations and patient queue"
          actions={
            <Button onClick={() => router.push("/appointments")}>
              <Calendar className="mr-2 h-4 w-4" />
              View Calendar
            </Button>
          }
        />
      }
    >
      <StatGrid items={statItems} columns={4} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Active consultations</CardTitle>
            <CardDescription>
              Visits in progress for today&apos;s queue (you have already
              started or called the patient). Continue the clinical record.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeConsultations.length === 0 ? (
              <div className="ui-card-surface flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-8 text-center">
                <Stethoscope className="mb-2 h-8 w-8 opacity-50 text-muted-foreground" aria-hidden />
                <p className="ui-helper-text">No active consultations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeConsultations.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-primary/20 bg-primary/5 p-3 sm:p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="shrink-0">
                        <AvatarFallback>
                          {item.patient?.firstName?.[0]}
                          {item.patient?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {item.patient?.firstName} {item.patient?.lastName}
                        </p>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3 shrink-0" aria-hidden />
                          <span>Started:</span>
                          <span className="ml-1">
                          {item.consultationStart
                            ? new Date(
                                item.consultationStart,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canStartConsultation ? (
                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={isStartingConsultation}
                        onClick={() =>
                          void handleStartConsultation(
                            item.appointmentId || item.id,
                          )
                        }
                      >
                        Continue
                      </Button>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        View only
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Waiting room</CardTitle>
            <CardDescription>
              Checked-in patients on today&apos;s queue who have not been
              called in yet. Start their visit when you are ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {waitingList.length === 0 ? (
              <div className="ui-card-surface flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-8 text-center">
                <Users className="mb-2 h-8 w-8 opacity-50 text-muted-foreground" aria-hidden />
                <p className="ui-helper-text">Waiting room is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {waitingList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card p-3 sm:p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
                        {item.tokenNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {item.patient?.firstName} {item.patient?.lastName}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {humanizeUiLabel(item.tokenType)}
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Wait: {item.estimatedWaitTime} min
                          </span>
                        </div>
                      </div>
                    </div>
                    {canStartConsultation ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="shrink-0"
                        disabled={isStartingConsultation}
                        onClick={() =>
                          void handleStartConsultation(
                            item.appointmentId || item.id,
                          )
                        }
                      >
                        <Play className="mr-2 h-3 w-3" />
                        Open
                      </Button>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        View only
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPageScaffold>
  );
};
