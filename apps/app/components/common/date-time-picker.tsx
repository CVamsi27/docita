"use client";

import * as React from "react";
import { format } from "date-fns";
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

interface DateTimePickerProps {
  value?: string; // ISO datetime-local format: "2024-01-15T09:30"
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  className?: string;
}

// Generate time slots in 15-minute intervals
const generateTimeSlots = () => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
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

const TIME_SLOTS = generateTimeSlots();

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  disabled = false,
  minDate,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const timeListRef = React.useRef<HTMLDivElement>(null);

  // Parse the datetime-local string into date and time parts
  const { dateValue, timeValue } = React.useMemo(() => {
    if (!value) return { dateValue: undefined, timeValue: "09:00" };

    const date = new Date(value);
    if (isNaN(date.getTime()))
      return { dateValue: undefined, timeValue: "09:00" };

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    const mins = minutes.toString().padStart(2, "0");

    return {
      dateValue: date,
      timeValue: `${hours}:${mins}`,
    };
  }, [value]);

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
    date.setHours(hours ?? 9, minutes ?? 0, 0, 0);

    // Convert to datetime-local format
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);

    onChange?.(localISOTime);
  };

  const handleTimeChange = (time: string) => {
    const date = dateValue ? new Date(dateValue) : new Date();
    const [hours, minutes] = time.split(":").map(Number);
    date.setHours(hours ?? 9, minutes ?? 0, 0, 0);

    // Convert to datetime-local format
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);

    onChange?.(localISOTime);
  };

  const displayValue = React.useMemo(() => {
    if (!dateValue) return null;
    const timeSlot = TIME_SLOTS.find((s) => s.value === timeValue);
    return `${format(dateValue, "MMM d, yyyy")} at ${timeSlot?.label || timeValue}`;
  }, [dateValue, timeValue]);

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
      <PopoverContent className="w-auto p-0 z-[100]" align="start">
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
                {TIME_SLOTS.map((slot) => (
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
