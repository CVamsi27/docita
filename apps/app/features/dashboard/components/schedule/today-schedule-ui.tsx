import Link from "next/link";
import { format } from "date-fns";
import { Calendar, ChevronRight, Clock, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";

import { DashboardAppointment } from "@workspace/types";

export interface TodayScheduleUIProps {
  appointments: DashboardAppointment[];
}

export function TodayScheduleUI({ appointments }: TodayScheduleUIProps) {
  return (
    <Card className="lg:col-span-2 border border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Today&apos;s Schedule
              </CardTitle>
              <CardDescription className="text-xs">
                {appointments.length} appointment
                {appointments.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
          <ViewAllLinkUI href="/appointments" />
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
                    "group flex items-center gap-2 sm:gap-4 rounded-lg border border-transparent p-3 sm:p-4 transition-colors duration-150",
                    apt.status === "completed" && "opacity-60 bg-muted/30",
                    apt.status === "in-progress" &&
                      "bg-primary/8 border-primary/20 ring-1 ring-primary/30",
                    isNext && "bg-muted/40",
                    "hover:bg-muted/60 hover:border-border/50",
                  )}
                >
                  {}
                  <div className="flex flex-col items-center justify-center min-w-10 sm:min-w-12 text-center">
                    <p
                      className={cn(
                        "text-sm font-bold leading-none",
                        apt.status === "in-progress" && "text-primary",
                      )}
                    >
                      {format(new Date(apt.startTime), "h:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(new Date(apt.startTime), "a")}
                    </p>
                  </div>

                  {}
                  <div className="relative h-10 flex items-center">
                    <div className="w-px h-full bg-border" />
                    {apt.status === "in-progress" && (
                      <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                    {apt.status === "completed" && (
                      <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-success" />
                    )}
                  </div>

                  {}
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5 text-primary text-xs font-medium">
                      {apt.patient?.firstName?.[0]}
                      {apt.patient?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {apt.patient?.firstName} {apt.patient?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {apt.type?.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>

                  {}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="hidden sm:block"><StatusBadge status={apt.status} /></span>
                    {(apt.status === "scheduled" ||
                      apt.status === "in-progress") && (
                      <Button
                        size="icon"
                        variant={
                          apt.status === "in-progress" ? "default" : "ghost"
                        }
                        className={cn(
                          "h-7 w-7 sm:h-8 sm:w-8",
                          apt.status === "in-progress" && "shadow-sm",
                        )}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
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
