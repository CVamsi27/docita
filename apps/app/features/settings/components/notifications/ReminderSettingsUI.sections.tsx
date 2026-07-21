"use client";
// jscpd:ignore-start
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { PAYMENT_REMINDER_DAY_PRESETS } from "@workspace/types";
import type { ReminderSettingsFormValues } from "@workspace/types";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives"
import { Button, Label, Switch } from "@workspace/ui/components";
import {
  FormControl,
// jscpd:ignore-end
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { TIME_UNITS } from "./ReminderSettingsUI.helpers";

type EnabledFieldName =
  | "appointment.enabled"
  | "followUp.enabled"
  | "prescription.enabled"
  | "schedule.enabled"
  | "overduePayment.enabled";

function SectionCard({
  label,
  description,
  form,
  enabledName,
  children,
}: {
  label: string;
  description: string;
  form: ReturnType<typeof useForm<ReminderSettingsFormValues>>;
  enabledName: EnabledFieldName;
  children: ReactNode;
}) {
  const enabled = form.watch(enabledName);
  return (
    <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <FormField
          control={form.control}
          name={enabledName}
          render={({ field }) => (
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          )}
        />
      </div>
      {enabled && children}
    </div>
  );
}

export interface ReminderRowProps {
  label: string;
  description: string;
  enabledName:
    | "appointment.enabled"
    | "followUp.enabled"
    | "prescription.enabled"
    | "schedule.enabled";
  beforeName:
    | "appointment.before"
    | "followUp.before"
    | "prescription.before"
    | "schedule.before";
  unitName:
    | "appointment.unit"
    | "followUp.unit"
    | "prescription.unit"
    | "schedule.unit";
  form: ReturnType<typeof useForm<ReminderSettingsFormValues>>;
}

export function ReminderRow({
  label,
  description,
  enabledName,
  beforeName,
  unitName,
  form,
}: ReminderRowProps) {
  return (
    <SectionCard
      label={label}
      description={description}
      form={form}
      enabledName={enabledName}
    >
      <div className="flex items-start gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">
          Send
        </Label>
        <div className="flex flex-col">
          <FormField
            control={form.control}
            name={beforeName}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className="w-24 h-9 text-sm text-right"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage className="mt-1" />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col">
          <FormField
            control={form.control}
            name={unitName}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <Select
                  value={field.value ?? ""}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-32 h-9 text-sm">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIME_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="mt-1" />
              </FormItem>
            )}
          />
        </div>
        <span className="pt-2 text-xs text-muted-foreground">before</span>
      </div>
    </SectionCard>
  );
}

export function OverduePaymentReminderSection({
  form,
}: {
  form: ReturnType<typeof useForm<ReminderSettingsFormValues>>;
}) {
  const selectedDays = form.watch("overduePayment.daysAfterDue") ?? [];

  const toggleDay = (day: number) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((value) => value !== day)
      : [...selectedDays, day].sort((a, b) => a - b);
    form.setValue("overduePayment.daysAfterDue", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <SectionCard
      label="Overdue invoice WhatsApp reminders"
      description="Send the payment_reminder template after the due date (1, 3, and 7 days by default)."
      form={form}
      enabledName="overduePayment.enabled"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-muted-foreground">
            Send WhatsApp automatically
          </Label>
          <FormField
            control={form.control}
            name="overduePayment.autoSendWhatsApp"
            render={({ field }) => (
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">
            Days after due date
          </Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_REMINDER_DAY_PRESETS.map((day: number) => {
              const active = selectedDays.includes(day);
              return (
                <Button
                  key={day}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day)}
                >
                  {day} day{day === 1 ? "" : "s"}
                </Button>
              );
            })}
          </div>
          <FormField
            control={form.control}
            name="overduePayment.daysAfterDue"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </SectionCard>
  );
}
