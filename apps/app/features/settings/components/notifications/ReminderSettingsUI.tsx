"use client";
// jscpd:ignore-start
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
import { Button } from "@workspace/ui/components/form/button";
import { Bell } from "lucide-react";
import {
  useClinicSettings,
// jscpd:ignore-end
  useUpdateClinicSettings,
} from "@workspace/data-access";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Form } from "@workspace/ui/components/form/form";
import { ReminderSettingsLoadingCard } from "./reminder-settings-loading-card";
import {
  ReminderRow,
  OverduePaymentReminderSection,
} from "./ReminderSettingsUI.sections";
import { buildReminderSettingsPayload } from "./ReminderSettingsUI.helpers";

export const ReminderSettingsUI: FC = () => {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

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
    updateSettings(buildReminderSettingsPayload(values), {
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
    });
  };

  if (isLoading) return <ReminderSettingsLoadingCard />;

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
            {isSaving ? (
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                className="mr-2"
              />
            ) : null}
            Save reminder settings
          </Button>
        </div>
      </form>
    </Form>
  );
};
