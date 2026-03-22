import { useEffect, useState } from "react";
import { TimeSlotPickerUI } from "./TimeSlotPickerUI";
import { api } from "@/lib/api-client";
import { logger } from "@/lib/logger";

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

interface AvailableSlotResponse {
  time: string;
  endTime: string;
  doctorId: string;
  doctorName: string;
  specialization?: string;
  isAvailable: boolean;
}

export function TimeSlotPickerContainer({
  date,
  doctorId,
  onSlotSelect,
  selectedSlot = null,
}: TimeSlotPickerContainerProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeSlots = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          date: date.toISOString(),
          doctorId,
        });
        const response = await api.get<AvailableSlotResponse[]>(
          `/doctor-availability/slots?${queryParams.toString()}`,
        );
        const mapped: TimeSlot[] = response.map((slot) => ({
          time: slot.time,
          available: slot.isAvailable,
        }));
        setTimeSlots(mapped);
      } catch (err) {
        logger.error("Failed to fetch time slots", { error: err });
        setError("Failed to load available time slots. Please try again.");
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, [date, doctorId]);

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

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
