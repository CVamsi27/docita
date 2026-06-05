"use client";

import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Switch } from "@workspace/ui/components/form/switch";
import type { DaySchedule } from "./doctor-availability-config";

export function DoctorAvailabilityDayRow({
  day,
  onUpdate,
}: {
  day: DaySchedule;
  onUpdate: (patch: Partial<Omit<DaySchedule, "dayOfWeek">>) => void;
}) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[120px_1fr] gap-3 sm:gap-4 items-start rounded-lg border p-3">
      <div className="flex items-center gap-2 pt-1">
        <Switch
          checked={day.isActive}
          onCheckedChange={(val) => onUpdate({ isActive: val })}
          id={`toggle-${day.dayOfWeek}`}
          name={`availability-${day.dayOfWeek}-active`}
        />
        <Label
          htmlFor={`toggle-${day.dayOfWeek}`}
          className="text-sm font-medium cursor-pointer"
        >
          {day.dayOfWeek.slice(0, 3)}
        </Label>
      </div>

      <div
        className={
          day.isActive
            ? "grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"
            : "grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 opacity-40 pointer-events-none"
        }
      >
        <div className="space-y-1">
          <Label
            htmlFor={`availability-${day.dayOfWeek}-start`}
            className="text-xs text-muted-foreground"
          >
            Start
          </Label>
          <Input
            id={`availability-${day.dayOfWeek}-start`}
            name={`availability-${day.dayOfWeek}-start`}
            type="time"
            autoComplete="off"
            value={day.startTime}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
            disabled={!day.isActive}
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`availability-${day.dayOfWeek}-end`}
            className="text-xs text-muted-foreground"
          >
            End
          </Label>
          <Input
            id={`availability-${day.dayOfWeek}-end`}
            name={`availability-${day.dayOfWeek}-end`}
            type="time"
            autoComplete="off"
            value={day.endTime}
            onChange={(e) => onUpdate({ endTime: e.target.value })}
            disabled={!day.isActive}
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`availability-${day.dayOfWeek}-slot-duration`}
            className="text-xs text-muted-foreground"
          >
            Slot (min)
          </Label>
          <Input
            id={`availability-${day.dayOfWeek}-slot-duration`}
            name={`availability-${day.dayOfWeek}-slot-duration`}
            type="number"
            autoComplete="off"
            value={day.slotDuration}
            onChange={(e) => onUpdate({ slotDuration: Number(e.target.value) })}
            min={5}
            max={60}
            step={5}
            disabled={!day.isActive}
          />
        </div>
      </div>
    </div>
  );
}
