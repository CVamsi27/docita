"use client";

import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
  formatDate,
  formatScheduleTime,
  fromLocalISOString,
  toLocalISOString,
} from "@workspace/types";

interface DateTimePickerProps {
  value?: string; // ISO datetime-local format: "2024-01-15T09:30"
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  className?: string;
  startHour?: number; // Clinic opening hour (0-23)
  endHour?: number; // Clinic closing hour (0-23)
  timezone?: string; // Clinic timezone
}

// Generate time slots in 15-minute intervals
const generateTimeSlots = (startHour = 0, endHour = 23) => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      const value = `${h}:${m}`;
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? "AM" : "PM";
      const label = `${hour12}:${m} ${ampm}`;
      slots.push({ value, label });
    }
  }
  return slots;
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  disabled = false,
  minDate,
  className,
  startHour = 9,
  endHour = 18,
  timezone = DEFAULT_TIMEZONE,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const timeListRef = React.useRef<HTMLDivElement>(null);

  // Generate clinic-specific time slots
  const clinicTimeSlots = React.useMemo(
    () => generateTimeSlots(startHour, endHour),
    [startHour, endHour],
  );

  // Parse the datetime-local string into date and time parts
  const { dateValue, timeValue } = React.useMemo(() => {
    if (!value)
      return {
        dateValue: undefined,
        timeValue: `${startHour.toString().padStart(2, "0")}:00`,
      };

    // Parse the local ISO string using the clinic timezone
    const date = fromLocalISOString(value, { timezone });
    if (!date)
      return {
        dateValue: undefined,
        timeValue: `${startHour.toString().padStart(2, "0")}:00`,
      };

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    const mins = minutes.toString().padStart(2, "0");

    return {
      dateValue: date,
      timeValue: `${hours}:${mins}`,
    };
  }, [value, startHour, timezone]);

  // Filter available time slots based on selected date
  const availableTimeSlots = React.useMemo(() => {
    const now = new Date();
    const selectedDate = dateValue || now; // Default to today if no date selected

    return clinicTimeSlots.filter((slot) => {
      // Parse slot time
      const timeParts = slot.value.split(":").map(Number);
      const slotHours = timeParts[0] ?? 0;
      const slotMinutes = timeParts[1] ?? 0;

      // Create a date object with the slot time for comparison
      const slotDate = new Date(selectedDate);
      slotDate.setHours(slotHours, slotMinutes, 0, 0);

      // Disable if time is in past (add 15-minute buffer for booking)
      const bufferTime = new Date(now.getTime() + 15 * 60 * 1000);
      if (slotDate < bufferTime) {
        return false;
      }

      return true;
    });
  }, [clinicTimeSlots, dateValue]);

  // Scroll to selected time when popover opens
  React.useEffect(() => {
    if (open && timeListRef.current) {
      const selectedButton = timeListRef.current.querySelector(
        `[data-time="${timeValue}"]`,
      );
      if (selectedButton) {
        selectedButton.scrollIntoView({ block: "center" });
      }
    }
  }, [open, timeValue]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const [hours, minutes] = timeValue.split(":").map(Number);
    date.setHours(hours ?? startHour, minutes ?? 0, 0, 0);

    // Convert to datetime-local format using timezone-aware utility
    const localISOTime = toLocalISOString(date, { timezone });

    onChange?.(localISOTime);
  };

  const handleTimeChange = (time: string) => {
    const date = dateValue ? new Date(dateValue) : new Date();
    const [hours, minutes] = time.split(":").map(Number);
    date.setHours(hours ?? startHour, minutes ?? 0, 0, 0);

    // Convert to datetime-local format using timezone-aware utility
    const localISOTime = toLocalISOString(date, { timezone });

    onChange?.(localISOTime);
  };

  const displayValue = React.useMemo(() => {
    if (!dateValue) return null;
    const timeSlot = clinicTimeSlots.find((s) => s.value === timeValue);
    return `${formatDate(dateValue, DATE_FORMATS.DATE_MEDIUM, { timezone })} at ${timeSlot?.label || formatScheduleTime(timeValue)}`;
  }, [dateValue, timeValue, clinicTimeSlots, timezone]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-100" align="start">
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              return false;
            }}
            defaultMonth={dateValue}
            initialFocus
          />
          <div className="border-t sm:border-t-0 sm:border-l p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Time</Label>
            </div>
            <ScrollArea className="h-[200px] w-[120px] rounded-md border">
              <div className="p-2 space-y-1" ref={timeListRef}>
                {availableTimeSlots.map((slot) => (
                  <Button
                    key={slot.value}
                    data-time={slot.value}
                    variant={timeValue === slot.value ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => handleTimeChange(slot.value)}
                    type="button"
                  >
                    {slot.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
