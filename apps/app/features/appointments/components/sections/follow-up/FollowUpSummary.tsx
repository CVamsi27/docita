import { format } from "date-fns";
import {
  Bell,
  Calendar as CalendarIcon,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

interface FollowUpType {
  value: string;
  label: string;
}

interface FollowUpSummaryProps {
  selectedDate: Date;
  selectedTime: string;
  followUpType: string;
  followUpTypes: FollowUpType[];
  reminderEnabled: boolean;
  reminderDays: number;
  whatsappReminder: boolean;
}

export function FollowUpSummary({
  selectedDate,
  selectedTime,
  followUpType,
  followUpTypes,
  reminderEnabled,
  reminderDays,
  whatsappReminder,
}: FollowUpSummaryProps) {
  return (
    <div className="rounded-lg border p-4 bg-primary/5 space-y-2">
      <p className="text-sm font-medium">Summary</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <CalendarIcon className="h-3 w-3" />
          {format(selectedDate, "MMM d, yyyy")}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {selectedTime}
        </Badge>
        <Badge variant="secondary">
          {followUpTypes.find((t) => t.value === followUpType)?.label}
        </Badge>
        {reminderEnabled && (
          <Badge
            variant="outline"
            className="gap-1 badge-warning"
          >
            <Bell className="h-3 w-3" />
            Reminder {reminderDays}d before
          </Badge>
        )}
        {reminderEnabled && whatsappReminder && (
          <Badge
            variant="outline"
            className="gap-1 badge-success"
          >
            <MessageSquare className="h-3 w-3" />
            WhatsApp
          </Badge>
        )}
      </div>
    </div>
  );
}
