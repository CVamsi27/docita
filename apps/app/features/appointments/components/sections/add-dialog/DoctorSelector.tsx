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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2 } from "lucide-react";
import type { CreateAppointmentInput, Doctor } from "@workspace/types";

interface DoctorSelectorProps {
  form: UseFormReturn<CreateAppointmentInput>;
  doctors: Doctor[];
  doctorsLoading: boolean;
}

export function DoctorSelector({
  form,
  doctors,
  doctorsLoading,
}: DoctorSelectorProps) {
  return (
    <FormField
      control={form.control}
      name="doctorId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Doctor</FormLabel>
          <FormDescription>
            Choose who will own the appointment on the schedule.
          </FormDescription>
          <Select
            onValueChange={field.onChange}
            value={field.value ?? ""}
          >
            <FormControl>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Doctor" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {doctorsLoading ? (
                <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name ?? ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
