// jscpd:ignore-start
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";

import type { CreateAppointmentInput, Doctor } from "@workspace/types";

interface DoctorSelectorProps {
// jscpd:ignore-end
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
        <FormItem className="min-w-0">
          <FormLabel>Doctor</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value ?? ""}
          >
            <FormControl>
              <SelectTrigger className="min-h-11 w-full min-w-0">
                <SelectValue placeholder="Doctor" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {doctorsLoading ? (
                <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                  <DocitaLoadingIndicator variant="inline" decorative />
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
