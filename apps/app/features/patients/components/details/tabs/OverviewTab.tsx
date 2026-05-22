"use client";

import { useMemo, type ComponentType } from "react";
import { formatTime } from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Pill,
  Stethoscope,
} from "lucide-react";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import type { Appointment } from "@workspace/types";
import { PatientStatsCardsUI } from "@/features/patients/components/profile/PatientStatsCardsUI";
import type { PatientStatistics } from "@/hooks/use-patient-data";

interface OverviewTabProps {
  appointments: Appointment[];
  statistics: PatientStatistics | null;
  onSelectTab: (tab: string) => void;
  onNavigateToRecordsSubTab: (subtab: string) => void;
  onScheduleVisit: () => void;
}

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toDate = (value: string | Date | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

export function OverviewTab({
  appointments,
  statistics,
  onSelectTab,
  onNavigateToRecordsSubTab,
  onScheduleVisit,
}: OverviewTabProps) {
  const todaysAppointment = useMemo(() => {
    const today = new Date();
    const todays = appointments
      .filter((appt) => {
        const start = toDate(appt.startTime);
        return start ? isSameLocalDay(start, today) : false;
      })
      .sort((a, b) => {
        const aTime = toDate(a.startTime)?.getTime() ?? 0;
        const bTime = toDate(b.startTime)?.getTime() ?? 0;
        return aTime - bTime;
      });

    return (
      todays.find((a) => a.status === "in-progress") ??
      todays.find(
        (a) =>
          a.status === "scheduled" ||
          a.status === "confirmed" ||
          a.status === "checked-in",
      ) ??
      todays[0] ??
      null
    );
  }, [appointments]);

  const todayLabel = (() => {
    if (!todaysAppointment) return null;
    const start = toDate(todaysAppointment.startTime);
    if (!start) return null;
    return formatTime(start, "h:mm a");
  })();

  const statusBadgeVariant: "default" | "secondary" | "destructive" | "outline" =
    todaysAppointment?.status === "in-progress"
      ? "default"
      : todaysAppointment?.status === "completed"
        ? "secondary"
        : todaysAppointment?.status === "no-show" ||
            todaysAppointment?.status === "cancelled"
          ? "destructive"
          : "outline";

  return (
    <div className="space-y-6">
      <PatientStatsCardsUI statistics={statistics} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Today&apos;s visit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysAppointment ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {todayLabel ?? "Scheduled"}
                      {todaysAppointment.type
                        ? ` \u00b7 ${humanizeUiLabel(todaysAppointment.type)}`
                        : ""}
                    </p>
                    {(todaysAppointment.chiefComplaint ||
                      todaysAppointment.notes) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {todaysAppointment.chiefComplaint ??
                          todaysAppointment.notes}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={statusBadgeVariant}
                    className="shrink-0 text-xs"
                  >
                    {humanizeUiLabel(todaysAppointment.status)}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No appointment scheduled for today.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction
              icon={Stethoscope}
              label="View all visits"
              onClick={() => onSelectTab("visits")}
            />
            <QuickAction
              icon={ClipboardList}
              label="View medical records"
              onClick={() => onSelectTab("records")}
            />
            <QuickAction
              icon={Pill}
              label="View prescriptions"
              onClick={() => onNavigateToRecordsSubTab("prescriptions")}
            />
            <QuickAction
              icon={Calendar}
              label="Schedule a visit"
              onClick={onScheduleVisit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function QuickAction({ icon: Icon, label, onClick }: QuickActionProps) {
  return (
    <Button
      variant="ghost"
      className="w-full justify-between h-9 px-2 text-sm"
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
