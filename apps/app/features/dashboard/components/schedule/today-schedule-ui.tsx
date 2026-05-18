"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Clock, Play } from "lucide-react";
import { formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Avatar, AvatarFallback } from "@workspace/ui/components/indicators/avatar";
import { cn } from "@workspace/ui/lib/utils";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

import type { AppointmentListItem } from "@workspace/data-access";

export interface TodayScheduleUIProps {
  appointments: AppointmentListItem[];
}

export function TodayScheduleUI({ appointments }: TodayScheduleUIProps) {
  return (
    <Card className="lg:col-span-2 border border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <SymbolTooltip label="Today's appointments">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
                <Clock className="h-4 w-4" aria-hidden />
              </div>
            </SymbolTooltip>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">
                Today&apos;s Schedule
              </CardTitle>
              <CardDescription className="text-xs">
                {appointments.length} appointment
                {appointments.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
          <div className="shrink-0">
            <ViewAllLinkUI href="/appointments" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {appointments.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={Calendar}
              title="No appointments today"
              description="Your schedule is clear. Time to catch up or relax!"
              action={{
                label: "Schedule visit",
                href: "/appointments?action=new",
              }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.slice(0, 5).map((apt, idx) => {
              const isNext =
                apt.status === "scheduled" &&
                !appointments
                  .slice(0, idx)
                  .some((a) => a.status === "scheduled");

              return (
                <Link
                  key={apt.id}
                  href={`/consultation/${apt.id}`}
                  className={cn(
                    "group grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-lg border border-transparent p-3 transition-colors duration-150 sm:grid-cols-[3rem_auto_2.25rem_minmax(0,1fr)_auto] sm:gap-3 sm:p-4",
                    apt.status === "completed" && "opacity-60 bg-muted/30",
                    apt.status === "in-progress" &&
                      "bg-primary/8 border-primary/20 ring-1 ring-primary/30",
                    isNext && "bg-muted/40",
                    "hover:bg-muted/60 hover:border-border/50",
                  )}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <p
                      className={cn(
                        "text-sm font-bold leading-none",
                        apt.status === "in-progress" && "text-primary",
                      )}
                    >
                      {formatDate(apt.startTime, "hh:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {formatDate(apt.startTime, "a")}
                    </p>
                  </div>

                  <div className="relative hidden h-10 items-center sm:flex">
                    <div className="w-px h-full bg-border" />
                    {apt.status === "in-progress" && (
                      <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                    {apt.status === "completed" && (
                      <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-success" />
                    )}
                  </div>

                  <Avatar className="hidden h-9 w-9 shrink-0 sm:flex">
                    <AvatarFallback className="border border-border/70 bg-background/70 text-foreground text-xs font-medium">
                      {apt.patient?.firstName?.[0]}
                      {apt.patient?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {apt.patient?.firstName} {apt.patient?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {humanizeUiLabel(apt.type)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                    <span className="hidden sm:block">
                      <StatusBadge status={apt.status} />
                    </span>
                    {(apt.status === "scheduled" ||
                      apt.status === "in-progress") && (
                      <SymbolTooltip
                        label={
                          apt.status === "in-progress"
                            ? "Continue consultation"
                            : "Open consultation"
                        }
                      >
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-transparent",
                            apt.status === "in-progress"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/50 text-muted-foreground group-hover:bg-muted",
                          )}
                          aria-hidden
                        >
                          <Play className="h-3 w-3" />
                        </span>
                      </SymbolTooltip>
                    )}
                  </div>
                </Link>
              );
            })}

            {appointments.length > 5 && (
              <Button
                asChild
                variant="ghost"
                className="w-full h-9 text-xs text-muted-foreground"
              >
                <Link href="/appointments">
                  +{appointments.length - 5} more appointments
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
