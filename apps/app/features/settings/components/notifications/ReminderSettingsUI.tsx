"use client";

import { FC, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Bell, Loader2 } from "lucide-react";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@workspace/ui/components/form";

const TIME_UNITS = [
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
];

const unitSchema = z.enum(["minute", "hour", "day", "week"]);

const reminderBlockSchema = z.object({
  enabled: z.boolean(),
  before: z
    .string()
    .trim()
    .optional()
    .refine((value) => value === undefined || value === "" || /^[0-9]+$/.test(value), "Enter a valid number"),
  unit: unitSchema.optional(),
});

const reminderSettingsSchema = z
  .object({
    appointment: reminderBlockSchema,
    followUp: reminderBlockSchema,
    invoice: reminderBlockSchema,
    prescription: reminderBlockSchema,
    schedule: reminderBlockSchema,
  })
  .superRefine((data, ctx) => {
    const blocks: Array<[keyof typeof data, string]> = [
      ["appointment", "Appointment reminder"],
      ["followUp", "Follow-up reminder"],
      ["invoice", "Invoice reminder"],
      ["prescription", "Prescription reminder"],
      ["schedule", "Schedule notification"],
    ];

    for (const [key] of blocks) {
      const block = data[key];
      if (!block.enabled) continue;

      const before = Number(block.before);
      if (!block.before || Number.isNaN(before) || before < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key, "before"],
          message: "Enter a value of 1 or more",
        });
      }
      if (!block.unit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key, "unit"],
          message: "Select a time unit",
        });
      }
    }
  });

type ReminderSettingsFormValues = z.infer<typeof reminderSettingsSchema>;

interface ReminderRowProps {
  label: string;
  description: string;
  enabledName:
    | "appointment.enabled"
    | "followUp.enabled"
    | "invoice.enabled"
    | "prescription.enabled"
    | "schedule.enabled";
  beforeName:
    | "appointment.before"
    | "followUp.before"
    | "invoice.before"
    | "prescription.before"
    | "schedule.before";
  unitName:
    | "appointment.unit"
    | "followUp.unit"
    | "invoice.unit"
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
    <div className="rounded-lg border p-4 space-y-3">
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

export const ReminderSettingsUI: FC = () => {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateClinicSettings();

  const form = useForm<ReminderSettingsFormValues>({
    resolver: zodResolver(reminderSettingsSchema),
    defaultValues: {
      appointment: { enabled: true, before: "1", unit: "day" },
      followUp: { enabled: false, before: "1", unit: "day" },
      invoice: { enabled: false, before: "3", unit: "day" },
      prescription: { enabled: false, before: "1", unit: "day" },
      schedule: { enabled: false, before: "1", unit: "hour" },
    },
  });

  useEffect(() => {
    if (!clinic) return;
    const s = (clinic.settings as ClinicAppSettings) || {};
    form.reset({
      appointment: {
        enabled: s.reminderBefore !== undefined,
        before: String(s.reminderBefore ?? "1"),
        unit: (s.reminderUnit as z.infer<typeof unitSchema>) ?? "day",
      },
      followUp: {
        enabled: s.followUpReminderEnabled ?? false,
        before: String(s.followUpReminderBefore ?? "1"),
        unit: (s.followUpReminderUnit as z.infer<typeof unitSchema>) ?? "day",
      },
      invoice: {
        enabled: s.invoiceReminderEnabled ?? false,
        before: String(s.invoiceReminderBefore ?? "3"),
        unit: (s.invoiceReminderUnit as z.infer<typeof unitSchema>) ?? "day",
      },
      prescription: {
        enabled: s.prescriptionReminderEnabled ?? false,
        before: String(s.prescriptionReminderBefore ?? "1"),
        unit: (s.prescriptionReminderUnit as z.infer<typeof unitSchema>) ?? "day",
      },
      schedule: {
        enabled: s.scheduleNotificationEnabled ?? false,
        before: String(s.scheduleNotificationBefore ?? "1"),
        unit: (s.scheduleNotificationUnit as z.infer<typeof unitSchema>) ?? "hour",
      },
    });
  }, [clinic, form]);

  const handleSave = (values: ReminderSettingsFormValues) => {
    updateSettings(
      {
        reminderBefore: values.appointment.enabled ? values.appointment.before : undefined,
        reminderUnit: values.appointment.enabled ? values.appointment.unit : undefined,
        followUpReminderEnabled: values.followUp.enabled,
        followUpReminderBefore: values.followUp.before,
        followUpReminderUnit: values.followUp.unit,
        invoiceReminderEnabled: values.invoice.enabled,
        invoiceReminderBefore: values.invoice.before,
        invoiceReminderUnit: values.invoice.unit,
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
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
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Reminder Settings</CardTitle>
                <CardDescription>
                  Configure when reminders are sent to patients
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReminderRow
              label="Appointment Reminder"
              description="Remind patient before their scheduled appointment"
              enabledName="appointment.enabled"
              beforeName="appointment.before"
              unitName="appointment.unit"
              form={form}
            />

            <ReminderRow
              label="Follow-up Visit Reminder"
              description="Remind patient about their scheduled follow-up visit"
              enabledName="followUp.enabled"
              beforeName="followUp.before"
              unitName="followUp.unit"
              form={form}
            />

            <ReminderRow
              label="Invoice / Payment Reminder"
              description="Remind patient about pending bills or upcoming payment due dates"
              enabledName="invoice.enabled"
              beforeName="invoice.before"
              unitName="invoice.unit"
              form={form}
            />

            <ReminderRow
              label="Prescription Reminder"
              description="Remind patient to take or refill their prescribed medication"
              enabledName="prescription.enabled"
              beforeName="prescription.before"
              unitName="prescription.unit"
              form={form}
            />

            <ReminderRow
              label="Appointment Schedule Notification"
              description="Notify patient when their appointment is scheduled or rescheduled"
              enabledName="schedule.enabled"
              beforeName="schedule.before"
              unitName="schedule.unit"
              form={form}
            />
          </CardContent>
        </Card>

        <Button className="w-full" type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Reminder Settings
        </Button>
      </form>
    </Form>
  );
};
