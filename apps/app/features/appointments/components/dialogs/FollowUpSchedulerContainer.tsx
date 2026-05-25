import { useState } from "react";
import { toast } from "sonner";
import { addMonths, addWeeks, formatDate } from "@workspace/utils";
import { FollowUpDetails, FollowUpSchedulerUI } from "./FollowUpSchedulerUI";
import { useConstants } from "@/hooks/use-constants";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

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
      showUserFacingErrorToast("Choose a follow-up date before scheduling");
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

      await new Promise((resolve) => setTimeout(resolve, 1000));

      onScheduled?.(followUp);
      toast.success(
        `Follow-up scheduled for ${formatDate(selectedDate, "MMMM d, yyyy")} at ${selectedTime}`,
        {
          description: reminderEnabled
            ? `Reminder will be sent ${reminderDays} day(s) before`
            : undefined,
        },
      );
      setOpen(false);

      setSelectedDate(undefined);
      setNotes("");
    } catch {
      showUserFacingErrorToast(
        "We could not schedule this follow-up. Please try again.",
      );
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
