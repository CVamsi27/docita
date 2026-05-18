"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { DAY_OF_WEEK_LABELS, type DayOfWeek } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CategoryAvatar } from "@workspace/ui/components/category-avatar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { ClinicWeeklyHourRow } from "@/features/onboarding/components/types";

const DISPLAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const SLOT_OPTIONS = [15, 30, 45, 60] as const;

function sortRowsForApi(rows: ClinicWeeklyHourRow[]): ClinicWeeklyHourRow[] {
  const order: DayOfWeek[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const map = new Map(rows.map((r) => [r.dayOfWeek, r]));
  return order.map((d) => {
    const row = map.get(d);
    if (!row) {
      throw new Error(`Missing weekly row for ${d}`);
    }
    return row;
  });
}

export function ClinicWeeklyHoursStep({
  initialRows,
  facilityWord,
  onBack,
  onContinue,
}: {
  initialRows: ClinicWeeklyHourRow[];
  facilityWord: string;
  onBack: () => void;
  onContinue: (rows: ClinicWeeklyHourRow[]) => void;
}) {
  const byDay = useMemo(() => {
    const m = new Map<DayOfWeek, ClinicWeeklyHourRow>();
    for (const r of initialRows) {
      m.set(r.dayOfWeek, { ...r });
    }
    return m;
  }, [initialRows]);

  const [rows, setRows] = useState<Record<DayOfWeek, ClinicWeeklyHourRow>>(
    () => {
      const next = {} as Record<DayOfWeek, ClinicWeeklyHourRow>;
      for (const d of DISPLAY_ORDER) {
        const r = byDay.get(d);
        next[d] = r
          ? { ...r }
          : {
              dayOfWeek: d,
              startTime: "09:00",
              endTime: "17:00",
              slotDuration: 30,
              isActive: false,
            };
      }
      return next;
    },
  );

  const updateDay = (day: DayOfWeek, patch: Partial<ClinicWeeklyHourRow>) => {
    setRows((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch, dayOfWeek: day },
    }));
  };

  const handleContinue = () => {
    const list = DISPLAY_ORDER.map((d) => rows[d]);
    if (!list.some((r) => r.isActive)) {
      showUserFacingErrorToast(
        null,
        "Turn on at least one day with visit hours.",
        "form",
      );
      return;
    }
    for (const r of list) {
      if (r.isActive && r.startTime >= r.endTime) {
        showUserFacingErrorToast(
          null,
          `End time must be after start time on ${DAY_OF_WEEK_LABELS[r.dayOfWeek]}.`,
          "form",
        );
        return;
      }
    }
    onContinue(sortRowsForApi(list));
  };

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm ring-1 ring-border/25">
      <CardHeader className="border-b border-border/60 bg-surface-2">
        <div className="flex gap-3.5 sm:gap-4">
          <CategoryAvatar
            icon={<Calendar strokeWidth={1.5} />}
            tone="primary"
            size="lg"
            className="mt-0.5"
          />
          <div className="min-w-0 space-y-1.5">
            <MicroLabel as="h2">Default visit hours</MicroLabel>
            <CardTitle className="text-[length:var(--fs-xl)] font-semibold tracking-tight sm:text-[length:var(--fs-2xl)]">
              When is this {facilityWord.toLowerCase()} open?
            </CardTitle>
            <CardDescription className="max-w-prose text-pretty text-[length:var(--fs-sm)] sm:text-[length:var(--fs-base)]">
              These hours become the default schedule for online booking. Each
              doctor can later set their own hours in settings; until then, they
              follow this weekly pattern.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3">
          {DISPLAY_ORDER.map((day) => {
            const dayRow = rows[day];
            return (
              <div
                key={day}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border/60 bg-surface-1 p-3.5 sm:grid sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-4"
              >
                <div className="flex items-center gap-2 pt-0.5">
                  <Switch
                    id={`clinic-hours-${day}-active`}
                    checked={dayRow.isActive}
                    onCheckedChange={(v) =>
                      updateDay(day, { isActive: Boolean(v) })
                    }
                  />
                  <Label
                    htmlFor={`clinic-hours-${day}-active`}
                    className="cursor-pointer text-[length:var(--fs-sm)] font-medium text-foreground"
                  >
                    {DAY_OF_WEEK_LABELS[day]}
                  </Label>
                </div>
                <div
                  className={
                    dayRow.isActive
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-3"
                      : "grid grid-cols-1 gap-3 opacity-45 sm:grid-cols-3"
                  }
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`clinic-hours-${day}-start`}
                      className="text-[length:var(--fs-xs)] text-muted-foreground"
                    >
                      Opens
                    </Label>
                    <Input
                      id={`clinic-hours-${day}-start`}
                      type="time"
                      value={dayRow.startTime}
                      onChange={(e) =>
                        updateDay(day, { startTime: e.target.value })
                      }
                      disabled={!dayRow.isActive}
                      className="rounded-[var(--radius-md)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`clinic-hours-${day}-end`}
                      className="text-[length:var(--fs-xs)] text-muted-foreground"
                    >
                      Closes
                    </Label>
                    <Input
                      id={`clinic-hours-${day}-end`}
                      type="time"
                      value={dayRow.endTime}
                      onChange={(e) =>
                        updateDay(day, { endTime: e.target.value })
                      }
                      disabled={!dayRow.isActive}
                      className="rounded-[var(--radius-md)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`clinic-hours-${day}-slot`}
                      className="text-[length:var(--fs-xs)] text-muted-foreground"
                    >
                      Slot length
                    </Label>
                    <Select
                      value={String(dayRow.slotDuration)}
                      onValueChange={(v) =>
                        updateDay(day, { slotDuration: Number(v) })
                      }
                      disabled={!dayRow.isActive}
                    >
                      <SelectTrigger
                        id={`clinic-hours-${day}-slot`}
                        className="rounded-[var(--radius-md)]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLOT_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/[0.06] px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-[var(--radius-md)] sm:w-auto"
          onClick={onBack}
        >
          Back to facility details
        </Button>
        <Button
          type="button"
          className="h-11 w-full rounded-[var(--radius-md)] px-6 text-[length:var(--fs-sm)] font-semibold sm:w-auto sm:min-w-[12rem]"
          onClick={handleContinue}
        >
          Continue to plan
        </Button>
      </CardFooter>
    </Card>
  );
}
