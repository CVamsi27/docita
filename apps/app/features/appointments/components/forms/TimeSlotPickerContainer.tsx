import { useMemo } from "react";
import { useDoctorAvailabilitySlots } from "@workspace/data-access";
import { TimeSlotPickerUI } from "./TimeSlotPickerUI";

interface TimeSlotPickerContainerProps {
  date: Date;
  doctorId: string;
  onSlotSelect: (time: string) => void;
  selectedSlot?: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function TimeSlotPickerContainer({
  date,
  doctorId,
  onSlotSelect,
  selectedSlot = null,
}: TimeSlotPickerContainerProps) {
  const slotsQuery = useDoctorAvailabilitySlots(date, doctorId);
  const timeSlots = useMemo<TimeSlot[]>(
    () =>
      (slotsQuery.data ?? []).map((slot) => ({
        time: slot.time,
        available: slot.isAvailable,
      })),
    [slotsQuery.data],
  );

  if (slotsQuery.isError) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>We could not load available time slots. Please try again.</p>
      </div>
    );
  }

  return (
    <TimeSlotPickerUI
      date={date}
      timeSlots={timeSlots}
      selectedSlot={selectedSlot}
      onSlotSelect={onSlotSelect}
      loading={slotsQuery.isLoading || slotsQuery.isFetching}
    />
  );
}
