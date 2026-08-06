"use client";

import { useTranslation } from "react-i18next";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Label, Switch } from "@workspace/ui/components";
import { DAY_OF_WEEK_LABELS, type DayOfWeek } from "@workspace/types";
import type { ClinicWeeklyHourRow } from "@/features/setup/components/onboarding/types";

const SLOT_OPTIONS = [15, 30, 45, 60] as const;

interface DayRowCardProps {
  day: DayOfWeek;
  dayRow: ClinicWeeklyHourRow;
  onUpdateDay: (day: DayOfWeek, patch: Partial<ClinicWeeklyHourRow>) => void;
}

export function DayRowCard({ day, dayRow, onUpdateDay }: DayRowCardProps) {
  const { t } = useTranslation("Onboarding.weeklyHours");
  return (
    <div
      key={day}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border/50 p-3.5 sm:grid sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-4"
    >
      <div className="flex items-center gap-2 pt-0.5">
        <Switch
          id={`clinic-hours-${day}-active`}
          checked={dayRow.isActive}
          onCheckedChange={(v) => onUpdateDay(day, { isActive: Boolean(v) })}
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
        {/* jscpd:ignore-start */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`clinic-hours-${day}-start`}
            className="text-[length:var(--fs-xs)] text-muted-foreground"
          >
            {t("opens")}
          </Label>
          <Input
            id={`clinic-hours-${day}-start`}
            type="time"
            value={dayRow.startTime}
            onChange={(e) => onUpdateDay(day, { startTime: e.target.value })}
            disabled={!dayRow.isActive}
            className="rounded-[var(--radius-md)]"
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={`clinic-hours-${day}-end`}
            className="text-[length:var(--fs-xs)] text-muted-foreground"
          >
            {t("closes")}
          </Label>
          <Input
            id={`clinic-hours-${day}-end`}
            type="time"
            value={dayRow.endTime}
            onChange={(e) => onUpdateDay(day, { endTime: e.target.value })}
            disabled={!dayRow.isActive}
            className="rounded-[var(--radius-md)]"
          />
        </div>
        {/* jscpd:ignore-end */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`clinic-hours-${day}-slot`}
            className="text-[length:var(--fs-xs)] text-muted-foreground"
          >
            {t("slotLength")}
          </Label>
          <Select
            value={String(dayRow.slotDuration)}
            onValueChange={(v) => onUpdateDay(day, { slotDuration: Number(v) })}
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
                  {t("minutes", { count: n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
