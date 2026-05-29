"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { FC, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reminderSettingsFormSchema,
  reminderFormValuesFromClinicSettings,
  PAYMENT_REMINDER_DAY_PRESETS,
  type ReminderSettingsFormValues,
} from "@workspace/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Switch } from "@workspace/ui/components/form/switch";
import { Bell } from "lucide-react";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@workspace/data-access";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@workspace/ui/components/form/form";

const TIME_UNITS = [
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
];

interface ReminderRowProps {
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

function ReminderRow({
  label,
  description,
  enabledName,
  beforeName,
  unitName,
  form,
}: ReminderRowProps) {
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
      {enabled && (
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
      )}
    </div>
  );
}

function OverduePaymentReminderSection({
  form,
}: {
  form: ReturnType<typeof useForm<ReminderSettingsFormValues>>;
}) {
  const enabled = form.watch("overduePayment.enabled");
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
    <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Overdue invoice WhatsApp reminders</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send the payment_reminder template after the due date (1, 3, and 7 days by default).
          </p>
        </div>
        <FormField
          control={form.control}
          name="overduePayment.enabled"
          render={({ field }) => (
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          )}
        />
      </div>
      {enabled ? (
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
              {PAYMENT_REMINDER_DAY_PRESETS.map((day) => {
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
      ) : null}
    </div>
  );
}

export const ReminderSettingsUI: FC = () => {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateClinicSettings();

  const form = useForm<ReminderSettingsFormValues>({
    resolver: zodResolver(reminderSettingsFormSchema),
    defaultValues: {
      appointment: { enabled: true, before: "1", unit: "day" },
      followUp: { enabled: false, before: "1", unit: "day" },
      prescription: { enabled: false, before: "1", unit: "day" },
      schedule: { enabled: false, before: "1", unit: "hour" },
      overduePayment: {
        enabled: true,
        autoSendWhatsApp: true,
        daysAfterDue: [...PAYMENT_REMINDER_DAY_PRESETS],
      },
    },
  });

  useEffect(() => {
    if (!clinic) return;
    form.reset(reminderFormValuesFromClinicSettings(clinic.settings));
  }, [clinic, form]);

  const handleSave = (values: ReminderSettingsFormValues) => {
    updateSettings(
      {
        reminderBefore: values.appointment.enabled ? values.appointment.before : undefined,
        reminderUnit: values.appointment.enabled ? values.appointment.unit : undefined,
        followUpReminderEnabled: values.followUp.enabled,
        followUpReminderBefore: values.followUp.before,
        followUpReminderUnit: values.followUp.unit,
        paymentReminderEnabled: values.overduePayment.enabled,
        paymentReminderDays: values.overduePayment.enabled
          ? values.overduePayment.daysAfterDue
          : [],
        paymentReminderAutoSendWhatsApp: values.overduePayment.autoSendWhatsApp,
        prescriptionReminderEnabled: values.prescription.enabled,
        prescriptionReminderBefore: values.prescription.before,
        prescriptionReminderUnit: values.prescription.unit,
        scheduleNotificationEnabled: values.schedule.enabled,
        scheduleNotificationBefore: values.schedule.before,
        scheduleNotificationUnit: values.schedule.unit,
      },
      {
        onSuccess: () => {
          toast.success("Reminder settings saved");
        },
        onError: (error) => {
          showUserFacingErrorToast(
            error,
            "We could not save these reminder settings. Please try again.",
            "save",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card
        role="status"
        aria-live="polite"
        aria-label="Loading reminder settings"
      >
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-24 w-full rounded-lg"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSave)}
        noValidate
        className="flex flex-col gap-6"
      >
        <Card>
          <CardHeader className="border-b border-border/60 pb-5">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Reminder settings</CardTitle>
                <CardDescription>
                  When and how reminders go out to patients.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-5">
            <ReminderRow
              label="Appointment reminder"
              description="Remind patient before their scheduled appointment"
              enabledName="appointment.enabled"
              beforeName="appointment.before"
              unitName="appointment.unit"
              form={form}
            />

            <ReminderRow
              label="Follow-up visit reminder"
              description="Remind patient about their scheduled follow-up visit"
              enabledName="followUp.enabled"
              beforeName="followUp.before"
              unitName="followUp.unit"
              form={form}
            />

            <OverduePaymentReminderSection form={form} />

            <ReminderRow
              label="Prescription reminder"
              description="Remind patient to take or refill their prescribed medication"
              enabledName="prescription.enabled"
              beforeName="prescription.before"
              unitName="prescription.unit"
              form={form}
            />

            <ReminderRow
              label="Appointment schedule notification"
              description="Notify patient when their appointment is scheduled or rescheduled"
              enabledName="schedule.enabled"
              beforeName="schedule.before"
              unitName="schedule.unit"
              form={form}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <DocitaLoadingIndicator variant="inline" decorative className="mr-2" /> : null}
            Save reminder settings
          </Button>
        </div>
      </form>
    </Form>
  );
};
