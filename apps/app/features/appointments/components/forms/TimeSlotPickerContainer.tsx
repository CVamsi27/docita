import { useEffect, useState } from "react";
import { TimeSlotPickerUI } from "./TimeSlotPickerUI";
import { api } from "@/lib/api-client";

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
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeSlots = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          date: date.toISOString(),
          doctorId,
        });
        const response = await api.get<TimeSlot[]>(
          `/appointments/time-slots?${queryParams.toString()}`,
        );
        setTimeSlots(response);
      } catch (error) {
        console.error("Failed to fetch time slots:", error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, [date, doctorId]);

  return (
    <TimeSlotPickerUI
      date={date}
      timeSlots={timeSlots}
      selectedSlot={selectedSlot}
      onSlotSelect={onSlotSelect}
      loading={loading}
    />
  );
}
