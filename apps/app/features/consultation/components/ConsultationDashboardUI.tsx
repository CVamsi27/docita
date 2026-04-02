"use client";

import { FC } from "react";
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

  if (isLoading) {
    return (
      <AppPageScaffold
        header={
          <PageHeader
            title="Consultation"
            description="Manage your daily consultations and patient queue."
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
          description="Manage your daily consultations and patient queue."
          actions={
            <Button onClick={() => router.push("/appointments")}>
              <Calendar className="mr-2 h-4 w-4" />
              View Calendar
            </Button>
          }
        />
      }
    >

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scheduled Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduledToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
            <CardDescription>Currently active consultations</CardDescription>
          </CardHeader>
          <CardContent>
            {activeConsultations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Stethoscope className="h-8 w-8 mb-2 opacity-50" />
                <p>No active consultations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeConsultations.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-primary/5"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {item.patient?.firstName?.[0]}
                          {item.patient?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {item.patient?.firstName} {item.patient?.lastName}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Started:{" "}
                          {item.consultationStart
                            ? new Date(
                                item.consultationStart,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </div>
                      </div>
                    </div>
                    {canStartConsultation ? (
                      <Button
                        size="sm"
                        disabled={isStartingConsultation}
                        onClick={() =>
                          void handleStartConsultation(
                            item.appointmentId || item.id,
                          )
                        }
                      >
                        Resume
                      </Button>
                    ) : (
                      <Badge variant="outline">View only</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Waiting Room</CardTitle>
            <CardDescription>Patients checked in and waiting</CardDescription>
          </CardHeader>
          <CardContent>
            {waitingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Users className="h-8 w-8 mb-2 opacity-50" />
                <p>Waiting room is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {waitingList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold">
                        {item.tokenNumber}
                      </div>
                      <div>
                        <p className="font-medium">
                          {item.patient?.firstName} {item.patient?.lastName}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.tokenType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Wait: {item.estimatedWaitTime} min
                          </span>
                        </div>
                      </div>
                    </div>
                    {canStartConsultation ? (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={isStartingConsultation}
                        onClick={() =>
                          void handleStartConsultation(
                            item.appointmentId || item.id,
                          )
                        }
                      >
                        <Play className="mr-2 h-3 w-3" />
                        Start
                      </Button>
                    ) : (
                      <Badge variant="outline">View only</Badge>
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
