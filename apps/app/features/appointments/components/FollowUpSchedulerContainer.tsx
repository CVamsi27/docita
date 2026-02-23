import { useState } from "react";
import { toast } from "sonner";
import { addMonths, addWeeks, format } from "date-fns";
import { FollowUpDetails, FollowUpSchedulerUI } from "./FollowUpSchedulerUI";

interface FollowUpSchedulerContainerProps {
  _patientId: string;
  patientName: string;
  patientPhone: string;
  _appointmentId?: string;
  onScheduled?: (followUp: FollowUpDetails) => void;
  className?: string;
}

const QUICK_SCHEDULES = [
  { label: "In 1 week", getValue: () => addWeeks(new Date(), 1) },
  { label: "In 2 weeks", getValue: () => addWeeks(new Date(), 2) },
  { label: "In 1 month", getValue: () => addMonths(new Date(), 1) },
  { label: "In 3 months", getValue: () => addMonths(new Date(), 3) },
  { label: "In 6 months", getValue: () => addMonths(new Date(), 6) },
];

import { useConstants } from "@/features/_shared/hooks/use-constants";

export function FollowUpSchedulerContainer({
  _patientId,
  patientName,
  patientPhone,
  _appointmentId,
  onScheduled,
  className,
}: FollowUpSchedulerContainerProps) {
  const { data: constants } = useConstants();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [followUpType, setFollowUpType] = useState("follow_up");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(1);
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [notes, setNotes] = useState("");

  const handleQuickSchedule = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSchedule = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setLoading(true);

    try {
      const followUp: FollowUpDetails = {
        date: selectedDate,
        time: selectedTime,
        type: followUpType,
        reminderEnabled,
        reminderDays,
        whatsappReminder,
        notes,
      };

      // Simulate API call - In real implementation, this would call a mutation
      // which would use patientId and appointmentId
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onScheduled?.(followUp);
      toast.success(
        `Follow-up scheduled for ${format(selectedDate, "MMMM d, yyyy")} at ${selectedTime}`,
        {
          description: reminderEnabled
            ? `Reminder will be sent ${reminderDays} day(s) before`
            : undefined,
        },
      );
      setOpen(false);

      // Reset form
      setSelectedDate(undefined);
      setNotes("");
    } catch {
      toast.error("Failed to schedule follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FollowUpSchedulerUI
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      patientName={patientName}
      patientPhone={patientPhone}
      selectedDate={selectedDate}
      onDateSelect={setSelectedDate}
      selectedTime={selectedTime}
      onTimeChange={setSelectedTime}
      followUpType={followUpType}
      onTypeChange={setFollowUpType}
      reminderEnabled={reminderEnabled}
      onReminderEnabledChange={setReminderEnabled}
      reminderDays={reminderDays}
      onReminderDaysChange={setReminderDays}
      whatsappReminder={whatsappReminder}
      onWhatsappReminderChange={setWhatsappReminder}
      notes={notes}
      onNotesChange={setNotes}
      onSchedule={handleSchedule}
      quickSchedules={QUICK_SCHEDULES}
      onQuickSchedule={handleQuickSchedule}
      className={className}
      followUpTypes={constants?.followUpTypes}
      reminderOptions={constants?.reminderDays}
    />
  );
}
