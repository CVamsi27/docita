import React from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  FormDescription,
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
  return (
    <>
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start time</FormLabel>
            <FormDescription>
              Pick a slot within clinic hours.
            </FormDescription>
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

      <FormField
        control={form.control}
        name="endTime"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>End time (optional)</FormLabel>
            <FormDescription>
              Leave blank to use the default appointment length.
            </FormDescription>
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
    </>
  );
}
