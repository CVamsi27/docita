import React from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { DateTimePicker } from "@workspace/ui/components/date-time-picker";
import { createAppointmentSchema } from "@workspace/types";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start time</FormLabel>
            <DateTimePicker
              value={
                field.value instanceof Date
                  ? field.value.toISOString()
                  : field.value
              }
              onChange={field.onChange}
              startHour={startHour}
              endHour={endHour}
              minDate={todayStart}
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
            <FormLabel>End time (optional)</FormLabel>
            <DateTimePicker
              value={
                field.value instanceof Date
                  ? field.value.toISOString()
                  : field.value
              }
              onChange={field.onChange}
              startHour={startHour}
              endHour={endHour}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
