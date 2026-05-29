import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { Clock } from "lucide-react";
import { formatDate } from "@workspace/utils";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotPickerUIProps {
  date: Date;
  timeSlots: TimeSlot[];
  selectedSlot: string | null;
  onSlotSelect: (time: string) => void;
  loading?: boolean;
}

export function TimeSlotPickerUI({
  date,
  timeSlots,
  selectedSlot,
  onSlotSelect,
  loading = false,
}: TimeSlotPickerUIProps) {
  if (loading) {
    return (
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="status"
        aria-live="polite"
        aria-label="Loading time slots"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-md" />
        ))}
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No available time slots for {formatDate(date, "MMM d, yyyy")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Select time</h3>
        <Badge variant="outline">{formatDate(date, "EEEE, MMM d")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {timeSlots.map((slot) => (
          <Button
            key={slot.time}
            variant={selectedSlot === slot.time ? "default" : "outline"}
            disabled={!slot.available}
            onClick={() => onSlotSelect(slot.time)}
            className="h-12"
          >
            {slot.time}
          </Button>
        ))}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}
