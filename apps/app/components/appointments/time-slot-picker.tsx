"use client";

import * as React from "react";
import { cn } from "@/lib/design-system";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  addMinutes,
  format,
  isAfter,
  isBefore,
  isSameDay,
  setHours,
  setMinutes,
} from "date-fns";
import { Check, Clock } from "lucide-react";

interface TimeSlot {
  time: Date;
  available: boolean;
  label?: string;
}

interface TimeSlotPickerProps {
  date: Date;
  selectedTime?: Date;
  onSelect: (time: Date) => void;
  bookedSlots?: Date[];
  startHour?: number;
  endHour?: number;
  slotDuration?: number; // in minutes
  className?: string;
  showLabels?: boolean;
  disablePastSlots?: boolean;
}

/**
 * Time slot picker for appointment scheduling
 */
export function TimeSlotPicker({
  date,
  selectedTime,
  onSelect,
  bookedSlots = [],
  startHour = 9,
  endHour = 18,
  slotDuration = 30,
  className,
  showLabels = true,
  disablePastSlots = true,
}: TimeSlotPickerProps) {
  // Generate time slots
  const slots = React.useMemo(() => {
    const now = new Date();
    const result: TimeSlot[] = [];
    let currentTime = setMinutes(setHours(date, startHour), 0);
    const endTime = setMinutes(setHours(date, endHour), 0);

    while (isBefore(currentTime, endTime)) {
      const slotTime = new Date(currentTime);

      // Check if booked
      const isBooked = bookedSlots.some(
        (booked) =>
          format(booked, "HH:mm") === format(slotTime, "HH:mm") &&
          isSameDay(booked, slotTime),
      );

      // Check if in past (only for today)
      const isPast =
        disablePastSlots && isSameDay(date, now) && isBefore(slotTime, now);

      result.push({
        time: slotTime,
        available: !isBooked && !isPast,
      });

      currentTime = addMinutes(currentTime, slotDuration);
    }

    return result;
  }, [date, bookedSlots, startHour, endHour, slotDuration, disablePastSlots]);

  // Group by morning/afternoon/evening
  const groupedSlots = React.useMemo(() => {
    return {
      morning: slots.filter((s) => s.time.getHours() < 12),
      afternoon: slots.filter(
        (s) => s.time.getHours() >= 12 && s.time.getHours() < 17,
      ),
      evening: slots.filter((s) => s.time.getHours() >= 17),
    };
  }, [slots]);

  const isSelected = (time: Date) => {
    if (!selectedTime) return false;
    return format(time, "HH:mm") === format(selectedTime, "HH:mm");
  };

  const renderSlot = (slot: TimeSlot) => (
    <Button
      key={slot.time.toISOString()}
      variant={isSelected(slot.time) ? "default" : "outline"}
      size="sm"
      className={cn(
        "h-9 min-w-[70px]",
        !slot.available && "opacity-50 cursor-not-allowed line-through",
        isSelected(slot.time) && "ring-2 ring-primary ring-offset-2",
      )}
      disabled={!slot.available}
      onClick={() => onSelect(slot.time)}
    >
      {isSelected(slot.time) && <Check className="h-3 w-3 mr-1" />}
      {format(slot.time, "h:mm a")}
    </Button>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {showLabels && groupedSlots.morning.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Morning
          </h4>
          <div className="flex flex-wrap gap-2">
            {groupedSlots.morning.map(renderSlot)}
          </div>
        </div>
      )}

      {showLabels && groupedSlots.afternoon.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Afternoon
          </h4>
          <div className="flex flex-wrap gap-2">
            {groupedSlots.afternoon.map(renderSlot)}
          </div>
        </div>
      )}

      {showLabels && groupedSlots.evening.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Evening
          </h4>
          <div className="flex flex-wrap gap-2">
            {groupedSlots.evening.map(renderSlot)}
          </div>
        </div>
      )}

      {!showLabels && (
        <div className="flex flex-wrap gap-2">{slots.map(renderSlot)}</div>
      )}
    </div>
  );
}

interface CompactTimePickerProps {
  selectedTime?: Date;
  onSelect: (time: Date) => void;
  date: Date;
  bookedSlots?: Date[];
  startHour?: number;
  endHour?: number;
  slotDuration?: number;
  className?: string;
}

/**
 * Compact scrollable time picker for limited space
 */
export function CompactTimePicker({
  selectedTime,
  onSelect,
  date,
  bookedSlots = [],
  startHour = 9,
  endHour = 18,
  slotDuration = 15,
  className,
}: CompactTimePickerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Generate time slots
  const slots = React.useMemo(() => {
    const now = new Date();
    const result: TimeSlot[] = [];
    let currentTime = setMinutes(setHours(date, startHour), 0);
    const endTime = setMinutes(setHours(date, endHour), 0);

    while (isBefore(currentTime, endTime)) {
      const slotTime = new Date(currentTime);
      const isBooked = bookedSlots.some(
        (booked) => format(booked, "HH:mm") === format(slotTime, "HH:mm"),
      );
      // Only show times in future (today) or any time for future dates
      const isPast = isSameDay(date, now) && isBefore(slotTime, now);

      result.push({
        time: slotTime,
        available: !isBooked && !isPast,
      });

      currentTime = addMinutes(currentTime, slotDuration);
    }

    return result;
  }, [date, bookedSlots, startHour, endHour, slotDuration]);

  // Scroll to first available slot on mount
  React.useEffect(() => {
    const firstAvailable = slots.findIndex((s) => s.available);
    if (firstAvailable > 0 && scrollRef.current) {
      const scrollPosition = firstAvailable * 44; // approximate button width
      scrollRef.current.scrollLeft = scrollPosition - 50;
    }
  }, [slots]);

  return (
    <ScrollArea className={cn("w-full", className)}>
      <div ref={scrollRef} className="flex gap-2 pb-2">
        {slots.map((slot) => {
          const isSelected =
            selectedTime &&
            format(slot.time, "HH:mm") === format(selectedTime, "HH:mm");

          return (
            <Button
              key={slot.time.toISOString()}
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 shrink-0",
                !slot.available && "opacity-30 cursor-not-allowed",
              )}
              disabled={!slot.available}
              onClick={() => onSelect(slot.time)}
            >
              {format(slot.time, "h:mm")}
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface DayScheduleViewProps {
  date: Date;
  appointments: Array<{
    id: string;
    startTime: Date | string;
    endTime: Date | string;
    patientName: string;
    type?: string;
    status?: string;
  }>;
  onSlotClick?: (time: Date) => void;
  startHour?: number;
  endHour?: number;
  className?: string;
}

/**
 * Day schedule view with appointments
 */
export function DayScheduleView({
  date,
  appointments,
  onSlotClick,
  startHour = 8,
  endHour = 20,
  className,
}: DayScheduleViewProps) {
  const hours = React.useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  const getAppointmentsForHour = (hour: number) => {
    return appointments.filter((apt) => {
      const startTime = new Date(apt.startTime);
      return startTime.getHours() === hour && isSameDay(startTime, date);
    });
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className="divide-y">
        {hours.map((hour) => {
          const hourAppointments = getAppointmentsForHour(hour);
          const slotTime = setHours(date, hour);

          return (
            <div
              key={hour}
              className={cn(
                "flex min-h-[60px]",
                onSlotClick && "cursor-pointer hover:bg-muted/50",
              )}
              onClick={() => onSlotClick?.(setMinutes(slotTime, 0))}
            >
              <div className="w-16 shrink-0 p-2 text-xs text-muted-foreground border-r bg-muted/30">
                {format(slotTime, "h a")}
              </div>
              <div className="flex-1 p-1 space-y-1">
                {hourAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "rounded px-2 py-1 text-xs",
                      apt.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : apt.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-primary/10 text-primary",
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="font-medium">{apt.patientName}</div>
                    <div className="opacity-75">
                      {format(new Date(apt.startTime), "h:mm a")}
                      {apt.type && ` • ${apt.type}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook for managing time slot selection
 */
export function useTimeSlotSelection({
  initialTime,
  date,
  bookedSlots = [],
}: {
  initialTime?: Date;
  date: Date;
  bookedSlots?: Date[];
}) {
  const [selectedTime, setSelectedTime] = React.useState<Date | undefined>(
    initialTime,
  );

  const isTimeAvailable = React.useCallback(
    (time: Date) => {
      const timeStr = format(time, "HH:mm");
      return !bookedSlots.some(
        (booked) =>
          format(booked, "HH:mm") === timeStr && isSameDay(booked, date),
      );
    },
    [bookedSlots, date],
  );

  const selectTime = React.useCallback(
    (time: Date) => {
      if (isTimeAvailable(time)) {
        setSelectedTime(time);
        return true;
      }
      return false;
    },
    [isTimeAvailable],
  );

  const clearSelection = React.useCallback(() => {
    setSelectedTime(undefined);
  }, []);

  // Get next available slot
  const nextAvailable = React.useMemo(() => {
    const now = new Date();
    let checkTime = isSameDay(date, now)
      ? addMinutes(now, 30 - (now.getMinutes() % 30)) // Round to next 30 min
      : setMinutes(setHours(date, 9), 0);

    const endOfDay = setHours(date, 18);

    while (isBefore(checkTime, endOfDay)) {
      if (isTimeAvailable(checkTime) && isAfter(checkTime, now)) {
        return checkTime;
      }
      checkTime = addMinutes(checkTime, 30);
    }

    return null;
  }, [date, isTimeAvailable]);

  return {
    selectedTime,
    selectTime,
    clearSelection,
    isTimeAvailable,
    nextAvailable,
  };
}
