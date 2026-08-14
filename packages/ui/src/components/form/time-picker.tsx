// jscpd:ignore-start
"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "../overlay/popover";
import { ScrollArea } from "../layout/scroll-area";

interface TimePickerProps extends Omit<
  React.ComponentProps<typeof Button>,
  "children" | "onClick" | "onChange" | "type" | "value"
> {
  /**
   * HH:mm 24-hour time string (e.g. "09:00", "17:30"). Matches the
   * `<input type="time">` value contract so consumers can switch
   * implementations without a value-format migration.
   */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** First hour shown in the scroll list. Defaults to 0 (midnight). */
  startHour?: number;
  /** Last hour shown in the scroll list. Defaults to 23 (11pm). */
  endHour?: number;
  /**
   * Minute granularity. Defaults to 15 — matches the DateTimePicker so
   * a clinic that mixes both primitives sees consistent slot counts.
   */
  stepMinutes?: number;
  /** Render a 12-hour label ("9:00 AM") instead of a 24-hour label. */
  use12Hour?: boolean;
}

/**
 * Pad a number to two digits. Defined at module scope so it is reused
 * without reallocating the closure inside the slots generator.
 */
const pad2 = (n: number): string => n.toString().padStart(2, "0");

const formatLabel = (value: string, use12Hour: boolean): string => {
  const [hStr, mStr] = value.split(":");
  if (!hStr || !mStr) return value;
  const hour = Number(hStr);
  if (!use12Hour) return value;
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${hour12}:${mStr} ${ampm}`;
};

const generateTimeSlots = (
  startHour: number,
  endHour: number,
  stepMinutes: number,
) => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      slots.push(`${pad2(hour)}:${pad2(minute)}`);
    }
  }
  return slots;
};

const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "Select time",
      disabled = false,
      className,
      startHour = 0,
      endHour = 23,
      stepMinutes = 15,
      use12Hour = true,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const listRef = React.useRef<HTMLDivElement>(null);

    const slots = React.useMemo(
      () => generateTimeSlots(startHour, endHour, stepMinutes),
      [startHour, endHour, stepMinutes],
    );

    // Scroll the active slot into view when the popover opens.
    React.useEffect(() => {
      if (!open) return;
      const el = listRef.current?.querySelector<HTMLElement>(
        `[data-time-value="${value ?? ""}"]`,
      );
      el?.scrollIntoView({ block: "nearest" });
    }, [open, value]);

    const label = value ? formatLabel(value, use12Hour) : placeholder;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
            {...props}
          >
            <Clock className="mr-2 h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <ScrollArea className="h-72">
            <div ref={listRef} role="listbox" aria-label={placeholder}>
              {slots.map((slot) => {
                const isActive = slot === value;
                return (
                  <button
                    key={slot}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-time-value={slot}
                    onClick={() => {
                      onChange?.(slot);
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm transition-colors duration-150",
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {formatLabel(slot, use12Hour)}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  },
);

TimePicker.displayName = "TimePicker";

// jscpd:ignore-end

export { TimePicker };
export type { TimePickerProps };
