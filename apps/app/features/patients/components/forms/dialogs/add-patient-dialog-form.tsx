"use client";

import type { BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { Input } from "@workspace/ui/components/form/input";
import {
  Form,
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
import {
  DPDP_NOTICE_TEXT_STAFF,
  DPDP_NOTICE_TITLE,
  DPDP_NOTICE_VERSION,
  type PatientCreateFormValues,
} from "@workspace/types";
import { GENDER_OPTIONS } from "./add-patient-dialog-constants";

export function AddPatientDialogForm({
  form,
  dpdpAccepted,
  isPending,
  onSubmit,
  onCancel,
}: {
  form: UseFormReturn<PatientCreateFormValues>;
  dpdpAccepted: boolean;
  isPending: boolean;
  onSubmit: (e?: BaseSyntheticEvent) => void;
  onCancel: () => void;
}) {
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  First name <span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="First name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Last name <span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Last name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
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
            control={form.control}
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

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Gender <span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    const match = GENDER_OPTIONS.find((o) => o.value === value);
                    if (match) field.onChange(match.value);
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
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Date of Birth{" "}
                  <span className="text-destructive ml-0.5">*</span>
                </FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="dpdpConsent"
          render={({ field, fieldState }) => (
            <FormItem className="rounded-md border border-border/70 bg-muted/30 p-4">
              <FormLabel className="text-sm font-semibold">
                {DPDP_NOTICE_TITLE}
              </FormLabel>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {DPDP_NOTICE_TEXT_STAFF}
              </p>
              <FormControl>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={field.value?.accepted === true}
                    onCheckedChange={(checked) => {
                      field.onChange(
                        checked === true
                          ? {
                              accepted: true,
                              noticeVersion: DPDP_NOTICE_VERSION,
                              relation: "SELF",
                            }
                          : undefined,
                      );
                    }}
                    aria-invalid={fieldState.error ? true : undefined}
                  />
                  <span>
                    I confirm DPDP Act, 2023 consent has been obtained from the
                    patient (or their authorised representative).
                    <span className="text-destructive ml-0.5">*</span>
                  </span>
                </label>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !dpdpAccepted}>
            {isPending && (
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                className="mr-2"
              />
            )}
            Add Patient
          </Button>
        </div>
      </form>
    </Form>
  );
}
