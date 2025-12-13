"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Bell,
  Calendar as CalendarIcon,
  CalendarPlus,
  Check,
  Clock,
  MessageSquare,
} from "lucide-react";
import { addDays, addMonths, addWeeks, format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";

export interface FollowUpSchedulerProps {
  patientId: string;
  patientName: string;
  patientPhone: string;
  appointmentId?: string;
  onScheduled?: (followUp: FollowUpDetails) => void;
  className?: string;
}

interface FollowUpDetails {
  date: Date;
  time: string;
  type: string;
  reminderEnabled: boolean;
  reminderDays: number;
  whatsappReminder: boolean;
  notes: string;
}

const QUICK_SCHEDULES = [
  { label: "In 1 week", getValue: () => addWeeks(new Date(), 1) },
  { label: "In 2 weeks", getValue: () => addWeeks(new Date(), 2) },
  { label: "In 1 month", getValue: () => addMonths(new Date(), 1) },
  { label: "In 3 months", getValue: () => addMonths(new Date(), 3) },
  { label: "In 6 months", getValue: () => addMonths(new Date(), 6) },
];

const FOLLOW_UP_TYPES = [
  { value: "follow_up", label: "Follow-up Visit" },
  { value: "checkup", label: "Routine Checkup" },
  { value: "lab_review", label: "Lab Results Review" },
  { value: "medication_review", label: "Medication Review" },
  { value: "procedure", label: "Procedure" },
];

const REMINDER_DAYS = [
  { value: 1, label: "1 day before" },
  { value: 2, label: "2 days before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
];

export function FollowUpScheduler({
  patientName,
  patientPhone,
  onScheduled,
  className,
}: Omit<FollowUpSchedulerProps, "patientId" | "appointmentId">) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedTime, setSelectedTime] = React.useState("10:00");
  const [followUpType, setFollowUpType] = React.useState("follow_up");
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [reminderDays, setReminderDays] = React.useState(1);
  const [whatsappReminder, setWhatsappReminder] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  const handleQuickSchedule = (getValue: () => Date) => {
    setSelectedDate(getValue());
  };

  const handleSchedule = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setLoading(true);

    try {
      // In production, this would call the API to create the appointment and reminder
      const followUp: FollowUpDetails = {
        date: selectedDate,
        time: selectedTime,
        type: followUpType,
        reminderEnabled,
        reminderDays,
        whatsappReminder,
        notes,
      };

      // Simulate API call
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <CalendarPlus className="h-4 w-4" />
          Schedule Follow-up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Schedule Follow-up
          </DialogTitle>
          <DialogDescription>
            Schedule a follow-up appointment for {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Quick Schedule Buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Quick Schedule
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_SCHEDULES.map((schedule) => (
                <Button
                  key={schedule.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSchedule(schedule.getValue)}
                  className={cn(
                    "text-xs",
                    selectedDate &&
                      format(selectedDate, "yyyy-MM-dd") ===
                        format(schedule.getValue(), "yyyy-MM-dd") &&
                      "border-primary bg-primary/5",
                  )}
                >
                  {schedule.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Visit Type */}
          <div className="space-y-2">
            <Label>Visit Type</Label>
            <Select value={followUpType} onValueChange={setFollowUpType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reminders Section */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Send Reminder
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically remind patient before appointment
                </p>
              </div>
              <Checkbox
                checked={reminderEnabled}
                onCheckedChange={(checked) =>
                  setReminderEnabled(checked === true)
                }
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label className="text-sm">Remind</Label>
                  <Select
                    value={reminderDays.toString()}
                    onValueChange={(v) => setReminderDays(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_DAYS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      WhatsApp Reminder
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Send reminder via WhatsApp to {patientPhone}
                    </p>
                  </div>
                  <Checkbox
                    checked={whatsappReminder}
                    onCheckedChange={(checked) =>
                      setWhatsappReminder(checked === true)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this follow-up..."
              rows={2}
            />
          </div>

          {/* Summary */}
          {selectedDate && (
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
                  {FOLLOW_UP_TYPES.find((t) => t.value === followUpType)?.label}
                </Badge>
                {reminderEnabled && (
                  <Badge
                    variant="outline"
                    className="gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                  >
                    <Bell className="h-3 w-3" />
                    Reminder {reminderDays}d before
                  </Badge>
                )}
                {reminderEnabled && whatsappReminder && (
                  <Badge
                    variant="outline"
                    className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                  >
                    <MessageSquare className="h-3 w-3" />
                    WhatsApp
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedDate || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Scheduling...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Schedule Follow-up
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for use in consultation sidebar
interface QuickFollowUpProps {
  onScheduled?: (days: number) => void;
  className?: string;
}

export function QuickFollowUp({ onScheduled, className }: QuickFollowUpProps) {
  const quickOptions = [
    { label: "1 week", days: 7 },
    { label: "2 weeks", days: 14 },
    { label: "1 month", days: 30 },
  ];

  const handleQuickFollowUp = async (days: number) => {
    const date = addDays(new Date(), days);
    // In production, call API to create appointment
    toast.success(`Follow-up scheduled for ${format(date, "MMM d, yyyy")}`);
    onScheduled?.(days);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
        Quick Follow-up
      </Label>
      <div className="flex gap-2">
        {quickOptions.map((option) => (
          <Button
            key={option.days}
            variant="outline"
            size="sm"
            onClick={() => handleQuickFollowUp(option.days)}
            className="flex-1 text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
