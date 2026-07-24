import React, { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { createAppointmentSchema, type AvailableSlot } from "@workspace/types";
import { formatScheduleTime } from "@workspace/utils";
import { calendarSlotTimeToLocalIso, slotOccupiedByAppointments, type SlotBlockingAppointment } from "@/features/appointments/lib/calendar-slot-local-iso";
import { ApiSlotPickerField, ManualTimeRangeFields, type ApiSlotOption } from "./time-slot-picker-sections";

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

/**
 * Builds the selectable API-slot options for the given day/doctor — filtering
 * to bookable slots and mapping them to the value/label shape the dropdown
 * renders. Extracted from the component's `useMemo` body so the memo itself
 * stays a thin "compute and cache" wrapper around a pure, independently
 * readable transformation.
 */
function buildApiSlotOptions(
  selectedDate: Date | undefined,
  doctorId: string | undefined,
  availabilitySlots: AvailableSlot[],
  clinicTimezone: string,
  blockingAppointments: SlotBlockingAppointment[],
): ApiSlotOption[] {
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
}

/**
 * Memoizes the API-slot options for the selected day/doctor. Wrapping
 * `buildApiSlotOptions` in its own hook keeps the orchestrator's body focused
 * on "which layout to render" rather than the memo's call-and-deps mechanics.
 */
function useApiSlotOptions(
  selectedDate: Date | undefined,
  doctorId: string | undefined,
  availabilitySlots: AvailableSlot[],
  clinicTimezone: string,
  blockingAppointments: SlotBlockingAppointment[],
): ApiSlotOption[] {
  return useMemo(
    () =>
      buildApiSlotOptions(
        selectedDate,
        doctorId,
        availabilitySlots,
        clinicTimezone,
        blockingAppointments,
      ),
    [
      availabilitySlots,
      blockingAppointments,
      clinicTimezone,
      doctorId,
      selectedDate,
    ],
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
  const apiSlotOptions = useApiSlotOptions(
    selectedDate,
    doctorId,
    availabilitySlots,
    clinicTimezone,
    blockingAppointments,
  );

  if (useApiSlotPicker) {
    return (
      <ApiSlotPickerField
        form={form}
        apiSlotOptions={apiSlotOptions}
        disabled={slotsLoading || isResolvingDefaultSlot}
        showEmptyMessage={availabilitySlotsReady && apiSlotOptions.length === 0}
      />
    );
  }

  return (
    <ManualTimeRangeFields
      form={form}
      startHour={startHour}
      endHour={endHour}
      todayStart={todayStart}
      disabled={isResolvingDefaultSlot}
    />
  );
}
