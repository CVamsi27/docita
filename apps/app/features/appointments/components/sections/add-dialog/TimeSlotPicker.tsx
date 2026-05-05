import React, { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { DateTimePicker } from "@workspace/ui/components/date-time-picker";
import { createAppointmentSchema, type AvailableSlot } from "@workspace/types";
import { formatScheduleTime } from "@workspace/utils";
import {
  calendarSlotTimeToLocalIso,
  slotOccupiedByAppointments,
  type SlotBlockingAppointment,
} from "@/features/appointments/lib/calendar-slot-local-iso";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

interface TimeSlotPickerProps {
  form: UseFormReturn<CreateAppointmentInput>;
  startHour: number;
  endHour: number;
  /** True while the first bookable slot for the selected day is being loaded from the server. */
  isResolvingDefaultSlot?: boolean;
  selectedDate?: Date;
  doctorId?: string;
  availabilitySlotsReady?: boolean;
  availabilitySlots?: AvailableSlot[];
  clinicTimezone: string;
  blockingAppointments?: SlotBlockingAppointment[];
}

function slotSelectableForBooking(
  selectedDate: Date,
  slot: AvailableSlot,
  doctorId: string,
  clinicTimezone: string,
  blockingAppointments: SlotBlockingAppointment[],
): boolean {
  if (slot.doctorId !== doctorId) return false;
  if (!slot.isAvailable) return false;
  return !slotOccupiedByAppointments(
    selectedDate,
    slot.time,
    slot.endTime,
    clinicTimezone,
    blockingAppointments,
  );
}

export function TimeSlotPicker({
  form,
  startHour,
  endHour,
  isResolvingDefaultSlot = false,
  selectedDate,
  doctorId,
  availabilitySlotsReady = false,
  availabilitySlots = [],
  clinicTimezone,
  blockingAppointments = [],
}: TimeSlotPickerProps) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  /** Prefer API slot list whenever slots loaded — even if empty — so we never offer unfiltered times that ignore bookings. */
  const useApiSlotPicker = Boolean(
    availabilitySlotsReady && selectedDate && doctorId,
  );

  const apiSlotOptions = useMemo(() => {
    if (!selectedDate || !doctorId) return [];
    return availabilitySlots
      .filter((s) =>
        slotSelectableForBooking(
          selectedDate,
          s,
          doctorId,
          clinicTimezone,
          blockingAppointments,
        ),
      )
      .map((s) => ({
        value: calendarSlotTimeToLocalIso(selectedDate, s.time, clinicTimezone),
        endIso: calendarSlotTimeToLocalIso(
          selectedDate,
          s.endTime,
          clinicTimezone,
        ),
        label: `${formatScheduleTime(s.time)} – ${formatScheduleTime(s.endTime)}`,
      }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [
    availabilitySlots,
    blockingAppointments,
    clinicTimezone,
    doctorId,
    selectedDate,
  ]);

  if (useApiSlotPicker) {
    return (
      <div className="space-y-4">
        {isResolvingDefaultSlot && (
          <p className="text-xs text-muted-foreground">
            Finding the next available slot for this day.
          </p>
        )}
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => {
            const valueStr =
              typeof field.value === "string"
                ? field.value
                : field.value instanceof Date
                  ? ""
                  : "";
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Appointment slot</FormLabel>
                <Select
                  disabled={isResolvingDefaultSlot}
                  value={valueStr || undefined}
                  onValueChange={(value) => {
                    const match = apiSlotOptions.find((o) => o.value === value);
                    field.onChange(value);
                    if (match) {
                      form.setValue("endTime", match.endIso, {
                        shouldValidate: true,
                      });
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger
                      aria-invalid={!!form.formState.errors.startTime}
                    >
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {apiSlotOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        {apiSlotOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No open slots for this doctor on this day. Try another day or adjust
            availability.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isResolvingDefaultSlot && (
        <p className="text-xs text-muted-foreground">
          Finding the next available slot for this day.
        </p>
      )}
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start time</FormLabel>
            <FormControl>
              <DateTimePicker
                value={
                  field.value instanceof Date
                    ? field.value.toISOString()
                    : field.value
                }
                onChange={field.onChange}
                startHour={startHour}
                endHour={endHour}
                minDate={todayStart}
                disabled={isResolvingDefaultSlot}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="endTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>End time (optional)</FormLabel>
            <FormControl>
              <DateTimePicker
                value={
                  field.value instanceof Date
                    ? field.value.toISOString()
                    : field.value
                }
                onChange={field.onChange}
                startHour={startHour}
                endHour={endHour}
                disabled={isResolvingDefaultSlot}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
