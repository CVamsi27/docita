import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { CreateAppointmentInput } from "@workspace/types";
import type { SelectOption } from "@/lib/app-config-context";

interface AppointmentFormFieldsProps {
  form: UseFormReturn<CreateAppointmentInput>;
  appointmentTypeOptions: SelectOption[];
}

export function AppointmentFormFields({
  form,
  appointmentTypeOptions,
}: AppointmentFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormDescription>
              Use Other / Custom when the appointment does not fit a preset.
            </FormDescription>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Appointment type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {appointmentTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="md:col-span-2">
        <FormField
          control={form.control}
          name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormDescription>
              Add anything the team should know before the visit.
            </FormDescription>
            <FormControl>
              <Textarea
                placeholder="Additional notes"
                className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
