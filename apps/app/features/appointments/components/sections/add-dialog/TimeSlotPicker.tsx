// jscpd:ignore-start
import React, { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { DateTimePicker } from "@workspace/ui/components/form/date-time-picker";
import { createAppointmentSchema, type AvailableSlot } from "@workspace/types";
import { formatScheduleTime } from "@workspace/utils";
import {
  calendarSlotTimeToLocalIso,
// jscpd:ignore-end
  slotOccupiedByAppointments,
  type SlotBlockingAppointment,
} from "@/features/appointments/lib/calendar-slot-local-iso";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/**
 * Normalizes a `startTime`/`endTime` form value into the string shape
 * `DateTimePicker` expects — both fields can hold either a `Date` (set via
 * the picker) or an ISO string (set via slot selection), and both fields'
 * fallback render need the same conversion.
 */
function toDateTimePickerValue(value: Date | string | undefined) {
  return value instanceof Date ? value.toISOString() : value;
}

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

  /**
   * Whenever a date + doctor are chosen, the API slot picker is the intended UI.
   * Render its layout for the whole loading lifecycle (disabled + loading
   * placeholder until slots resolve) so the dialog never flips to the taller
   * manual two-picker fallback and back — that swap re-centers the dialog and
   * makes it visibly jump. The manual fallback only applies with no date/doctor.
   */
  const useApiSlotPicker = Boolean(selectedDate && doctorId);
  const slotsLoading = useApiSlotPicker && !availabilitySlotsReady;

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
    const disabled = slotsLoading || isResolvingDefaultSlot;
    return (
      <div className="space-y-4">
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
                  disabled={disabled}
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
                      <SelectValue
                        placeholder={
                          disabled
                            ? "Finding available slots…"
                            : "Select a time slot"
                        }
                      />
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
        {availabilitySlotsReady && apiSlotOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No open slots for this doctor on this day. Try another day or adjust
            availability.
          </p>
        )}
      </div>
    );
  }

  // Manual fallback only renders with no date/doctor, where the slot lookup
  // never runs — so no loading message is needed here.
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start time</FormLabel>
            <FormControl>
              <DateTimePicker
                value={toDateTimePickerValue(field.value)}
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
                value={toDateTimePickerValue(field.value)}
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
