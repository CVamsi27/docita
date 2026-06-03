"use client";

import type { Control, UseFormReturn } from "react-hook-form";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { z } from "zod";
import { Button } from "@workspace/ui/components/form/button";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { Input } from "@workspace/ui/components/form/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { updatePatientRequestSchema } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { GENDER_OPTIONS, GENDER_VALUES } from "./EditPatientDialogHelpers";

type PatientUpdateFormValues = z.infer<typeof updatePatientRequestSchema>;

// ---------------------------------------------------------------------------
// PatientBasicInfoFields
// ---------------------------------------------------------------------------

interface PatientBasicInfoFieldsProps {
  control: Control<PatientUpdateFormValues>;
}

export function PatientBasicInfoFields({
  control,
}: PatientBasicInfoFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              First Name <span className="text-destructive ml-0.5">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="First name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Last Name <span className="text-destructive ml-0.5">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="Last name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="phoneNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder="Phone number"
                inputMode="tel"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                type="email"
                placeholder="Email"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// PatientDemographicFields
// ---------------------------------------------------------------------------

interface PatientDemographicFieldsProps {
  control: Control<PatientUpdateFormValues>;
}

export function PatientDemographicFields({
  control,
}: PatientDemographicFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Gender <span className="text-destructive ml-0.5">*</span>
            </FormLabel>
            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                const parsed = parseStringEnumMember(GENDER_VALUES, value);
                if (parsed) {
                  field.onChange(parsed);
                }
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value || undefined}
                onChange={(date) =>
                  field.onChange(date?.toISOString().slice(0, 10) ?? "")
                }
                placeholder="Date of birth"
                maxDate={new Date()}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// DialogActionButtons
// ---------------------------------------------------------------------------

interface DialogActionButtonsProps {
  form: UseFormReturn<PatientUpdateFormValues>;
  onCancel: () => void;
  isPending: boolean;
}

export function DialogActionButtons({
  form,
  onCancel,
  isPending,
}: DialogActionButtonsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending && (
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
        )}
        Save Changes
      </Button>
    </div>
  );
}
