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
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

export interface FollowUpDetails {
  date: Date;
  time: string;
  type: string;
  reminderEnabled: boolean;
  reminderDays: number;
  whatsappReminder: boolean;
  notes: string;
}

export interface FollowUpType {
  value: string;
  label: string;
}

export interface ReminderOption {
  value: number;
  label: string;
}

interface FollowUpSchedulerUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  patientName: string;
  patientPhone: string;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  followUpType: string;
  onTypeChange: (type: string) => void;
  reminderEnabled: boolean;
  onReminderEnabledChange: (enabled: boolean) => void;
  reminderDays: number;
  onReminderDaysChange: (days: number) => void;
  whatsappReminder: boolean;
  onWhatsappReminderChange: (enabled: boolean) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSchedule: () => void;
  quickSchedules: Array<{ label: string; getValue: () => Date }>;
  onQuickSchedule: (date: Date) => void;
  className?: string;
  followUpTypes?: FollowUpType[];
  reminderOptions?: ReminderOption[];
}

export function FollowUpSchedulerUI({
  open,
  onOpenChange,
  loading,
  patientName,
  patientPhone,
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeChange,
  followUpType,
  onTypeChange,
  reminderEnabled,
  onReminderEnabledChange,
  reminderDays,
  onReminderDaysChange,
  whatsappReminder,
  onWhatsappReminderChange,
  notes,
  onNotesChange,
  onSchedule,
  quickSchedules,
  onQuickSchedule,
  className,
  followUpTypes = [],
  reminderOptions = [],
}: FollowUpSchedulerUIProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              {quickSchedules.map((schedule) => (
                <Button
                  key={schedule.label}
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickSchedule(schedule.getValue())}
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
                    onSelect={onDateSelect}
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
                  onChange={(e) => onTimeChange(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Visit Type */}
          <div className="space-y-2">
            <Label>Visit Type</Label>
            <Select value={followUpType} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {followUpTypes.map((type) => (
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
                  onReminderEnabledChange(checked === true)
                }
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label className="text-sm">Remind</Label>
                  <Select
                    value={reminderDays.toString()}
                    onValueChange={(v) => onReminderDaysChange(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reminderOptions.map((option) => (
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
                      onWhatsappReminderChange(checked === true)
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
              onChange={(e) => onNotesChange(e.target.value)}
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
                  {followUpTypes.find((t) => t.value === followUpType)?.label}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSchedule}
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
