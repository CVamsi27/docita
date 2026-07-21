"use client";

import {
  Input,
  Label,
  Switch
} from "@workspace/ui/components";
import type { DaySchedule } from "./doctor-availability-config";

function AvailabilityField({
  dayOfWeek,
  label,
  field,
  type,
  min,
  max,
  step,
  isActive,
  value,
  onChange,
}: {
  dayOfWeek: string;
  label: string;
  field: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  isActive: boolean;
  value: string | number;
  onChange: (value: string) => void;
}) {
  const id = `availability-${dayOfWeek}-${field}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type ?? "time"}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!isActive}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

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
        <AvailabilityField
          dayOfWeek={day.dayOfWeek}
          label="Start"
          field="start"
          isActive={day.isActive}
          value={day.startTime}
          onChange={(v) => onUpdate({ startTime: v })}
        />
        <AvailabilityField
          dayOfWeek={day.dayOfWeek}
          label="End"
          field="end"
          isActive={day.isActive}
          value={day.endTime}
          onChange={(v) => onUpdate({ endTime: v })}
        />
        <AvailabilityField
          dayOfWeek={day.dayOfWeek}
          label="Slot (min)"
          field="slot-duration"
          type="number"
          isActive={day.isActive}
          value={day.slotDuration}
          min={5}
          max={60}
          step={5}
          onChange={(v) => onUpdate({ slotDuration: Number(v) })}
        />
      </div>
    </div>
  );
}
