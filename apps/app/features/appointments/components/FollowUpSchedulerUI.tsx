"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";

import { Calendar } from "@workspace/ui/components/calendar";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Calendar as CalendarIcon, CalendarPlus, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { FollowUpForm } from "./sections/follow-up/FollowUpForm";
import { QuickScheduleButtons } from "./sections/follow-up/QuickScheduleButtons";
import { FollowUpSummary } from "./sections/follow-up/FollowUpSummary";

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
  // patientPhone,
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
          <QuickScheduleButtons
            quickSchedules={quickSchedules}
            onQuickSchedule={onQuickSchedule}
            selectedDate={selectedDate}
          />

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
                      !selectedDate && "text-muted-foreground"
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
            {/* Extracted Form Component */}
            <FollowUpForm
              followUpType={followUpType}
              onTypeChange={onTypeChange}
              selectedTime={selectedTime}
              onTimeChange={onTimeChange}
              reminderEnabled={reminderEnabled}
              onReminderEnabledChange={onReminderEnabledChange}
              reminderDays={reminderDays}
              onReminderDaysChange={onReminderDaysChange}
              whatsappReminder={whatsappReminder}
              onWhatsappReminderChange={onWhatsappReminderChange}
              notes={notes}
              onNotesChange={onNotesChange}
              followUpTypes={followUpTypes}
              reminderOptions={reminderOptions}
            />
          </div>

          {/* Summary */}
          {selectedDate && (
            <FollowUpSummary
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              followUpType={followUpType}
              followUpTypes={followUpTypes}
              reminderEnabled={reminderEnabled}
              reminderDays={reminderDays}
              whatsappReminder={whatsappReminder}
            />
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
