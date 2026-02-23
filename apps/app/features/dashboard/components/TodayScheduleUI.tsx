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
import { ViewAllLinkUI } from "./ViewAllLinkUI";

import { DashboardAppointment } from "@workspace/types";

export interface TodayScheduleUIProps {
  appointments: DashboardAppointment[];
}

export function TodayScheduleUI({ appointments }: TodayScheduleUIProps) {
  return (
    <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-xl">
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
                    "flex items-center gap-4 p-4 rounded-2xl transition-all group border border-transparent",
                    apt.status === "completed" && "opacity-60 bg-muted/30",
                    apt.status === "in-progress" &&
                      "bg-primary/5 ring-1 ring-primary/20 shadow-lg shadow-primary/5",
                    isNext && "bg-muted/40",
                    "hover:bg-muted/60 hover:border-border/50 hover:shadow-sm",
                  )}
                >
                  {/* Time */}
                  <div className="flex flex-col items-center justify-center min-w-12 text-center">
                    <p
                      className={cn(
                        "text-sm font-bold leading-none",
                        apt.status === "in-progress" && "text-primary",
                      )}
                    >
                      {format(new Date(apt.startTime), "h:mm")}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {format(new Date(apt.startTime), "a")}
                    </p>
                  </div>

                  {/* Divider with status indicator */}
                  <div className="relative h-10 flex items-center">
                    <div className="w-px h-full bg-border" />
                    {apt.status === "in-progress" && (
                      <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                    )}
                    {apt.status === "completed" && (
                      <span className="absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-green-500" />
                    )}
                  </div>

                  {/* Patient Info */}
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

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2">
                    <StatusBadge status={apt.status} />
                    {(apt.status === "scheduled" ||
                      apt.status === "in-progress") && (
                      <Button
                        size="icon"
                        variant={
                          apt.status === "in-progress" ? "default" : "ghost"
                        }
                        className={cn(
                          "h-8 w-8 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100",
                          apt.status === "in-progress" &&
                            "opacity-100 scale-100 shadow-md shadow-primary/20",
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
