"use client";

import { useMemo } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { getStatusColor } from "@workspace/ui/components/indicators/status-badge";
import type { AppointmentListItem } from "@workspace/data-access";
import { addDays, formatClinicPickerDayIsoFromSelection, formatClinicTodayPickerIso, formatUtcInstantAsClinicPickerIso, pickerIsoToLocalDate } from "@workspace/utils";
import { formatTime } from "@/lib/formatters";

interface AppointmentsWeekViewProps {
  /** Appointments spanning at least the visible week (reuses the month-range query). */
  appointments: AppointmentListItem[];
  /** Currently selected day, picker ISO (yyyy-mm-dd). Determines which week is shown. */
  selectedPickerIso: string;
  clinicTz: string;
  /** Select a day (clicking a column header) — keeps the day list in sync. */
  onSelectDay: (date: Date) => void;
  /** Open a specific appointment (defaults to selecting its day). */
  onOpenAppointment?: (appointment: AppointmentListItem) => void;
}

const WEEKDAY_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function patientName(appointment: AppointmentListItem): string {
  const first = appointment.patient?.firstName ?? "";
  const last = appointment.patient?.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full.length > 0 ? full : "Patient";
}

export function AppointmentsWeekView({
  appointments,
  selectedPickerIso,
  clinicTz,
  onSelectDay,
  onOpenAppointment,
}: AppointmentsWeekViewProps) {
  const todayIso = formatClinicTodayPickerIso(clinicTz);

  const days = useMemo(() => {
    const selectedDate = pickerIsoToLocalDate(selectedPickerIso);
    // Monday-start week: getDay() is 0 (Sun)..6 (Sat); shift so Monday = 0.
    const mondayOffset = (selectedDate.getDay() + 6) % 7;
    const weekStart = addDays(selectedDate, -mondayOffset);

    const byDay = new Map<string, AppointmentListItem[]>();
    for (const appointment of appointments) {
      const key = formatUtcInstantAsClinicPickerIso(
        appointment.startTime,
        clinicTz,
      );
      if (!key) continue;
      const bucket = byDay.get(key);
      if (bucket) bucket.push(appointment);
      else byDay.set(key, [appointment]);
    }

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const iso = formatClinicPickerDayIsoFromSelection(date, clinicTz);
      const dayAppointments = (byDay.get(iso) ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
      return {
        date,
        iso,
        label: WEEKDAY_LABEL[index] ?? "",
        dayNumber: date.getDate(),
        appointments: dayAppointments,
        isToday: iso === todayIso,
        isSelected: iso === selectedPickerIso,
      };
    });
  }, [appointments, selectedPickerIso, clinicTz, todayIso]);

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2"
      role="grid"
      aria-label="Weekly appointments"
    >
      {days.map((day) => (
        <div
          key={day.iso}
          role="gridcell"
          className={cn(
            "flex min-w-[8.5rem] flex-1 flex-col rounded-[var(--radius-md)] border bg-card",
            day.isSelected
              ? "border-primary/60 ring-1 ring-primary/30"
              : "border-border/60",
          )}
        >
          <button
            type="button"
            onClick={() => onSelectDay(day.date)}
            aria-pressed={day.isSelected}
            className={cn(
              "flex items-center justify-between gap-2 rounded-t-[var(--radius-md)] border-b border-border/50 px-2.5 py-2 text-left transition-colors duration-150 hover:bg-muted/40",
              day.isToday && "bg-muted/30",
            )}
          >
            <span className="flex flex-col">
              <span className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
                {day.label}
              </span>
              <span
                className={cn(
                  "text-[length:var(--fs-lg)] font-semibold tabular-nums leading-none",
                  day.isToday ? "text-primary" : "text-foreground",
                )}
              >
                {day.dayNumber}
              </span>
            </span>
            {day.appointments.length > 0 ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[length:var(--fs-2xs)] font-medium tabular-nums text-muted-foreground">
                {day.appointments.length}
              </span>
            ) : null}
          </button>

          <div className="flex flex-col gap-1.5 p-1.5">
            {day.appointments.length === 0 ? (
              <p className="px-1 py-3 text-center text-[length:var(--fs-2xs)] text-muted-foreground">
                —
              </p>
            ) : (
              day.appointments.map((appointment) => (
                <button
                  key={
                    appointment.id ||
                    `${appointment.patientId}-${appointment.startTime}`
                  }
                  type="button"
                  onClick={() =>
                    onOpenAppointment
                      ? onOpenAppointment(appointment)
                      : onSelectDay(day.date)
                  }
                  className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border/50 bg-background/60 px-2 py-1.5 text-left transition-colors duration-150 hover:border-border/80 hover:bg-muted/50"
                >
                  <span className="flex items-center justify-between gap-1.5">
                    <span className="text-[length:var(--fs-2xs)] font-medium tabular-nums text-muted-foreground">
                      {formatTime(appointment.startTime, "h:mm a")}
                    </span>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        getStatusColor(appointment.status),
                      )}
                      aria-hidden
                    />
                  </span>
                  <span className="truncate text-[length:var(--fs-xs)] font-medium text-foreground">
                    {patientName(appointment)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
