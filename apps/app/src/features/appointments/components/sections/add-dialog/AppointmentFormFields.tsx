import React from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import type { CreateAppointmentInput } from "@workspace/types";
import { PAYMENT_CHANNEL_OPTIONS } from "@workspace/types";
import type { SelectOption } from "@/lib/contexts/app-config-context";

interface AppointmentFormFieldsProps {
  form: UseFormReturn<CreateAppointmentInput>;
  appointmentTypeOptions: SelectOption[];
}

export function AppointmentFormFields({
  form,
  appointmentTypeOptions,
}: AppointmentFormFieldsProps) {
  const { t } = useTranslation("Appointments.formFields");
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("typeLabel")}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder={t("typePlaceholder")} />
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

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("notesLabel")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("notesPlaceholder")}
                className="min-h-24 resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="advanceAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("advanceLabel")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const next = e.target.value;
                    field.onChange(
                      next === "" ? undefined : Number.parseFloat(next),
                    );
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="advancePaymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("paidByLabel")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
                disabled={!form.watch("advanceAmount")}
              >
                <FormControl>
                  <SelectTrigger className="min-h-11 w-full">
                    <SelectValue placeholder={t("paymentMethodPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_CHANNEL_OPTIONS.map((option) => (
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
      </div>
    </div>
  );
}
