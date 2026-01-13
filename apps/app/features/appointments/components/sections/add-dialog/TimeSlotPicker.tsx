
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { DateTimePicker } from "@workspace/ui/components/date-time-picker";
import type { CreateAppointmentInput } from "@workspace/types";

interface TimeSlotPickerProps {
  form: UseFormReturn<CreateAppointmentInput>;
  startHour: number;
  endHour: number;
}

export function TimeSlotPicker({
  form,
  startHour,
  endHour,
}: TimeSlotPickerProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start Time</FormLabel>
            <DateTimePicker
              value={field.value}
              onChange={field.onChange}
              startHour={startHour}
              endHour={endHour}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="endTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>End Time (Optional)</FormLabel>
            <DateTimePicker
              value={field.value}
              onChange={field.onChange}
              startHour={startHour}
              endHour={endHour}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
