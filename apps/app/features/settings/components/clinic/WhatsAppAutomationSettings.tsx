"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useEffect } from "react";
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
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { MessageSquare } from "lucide-react";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form";

const whatsappSettingsSchema = z.object({
  whatsappAppointmentReminders: z.boolean(),
  whatsappFollowUpMessages: z.boolean(),
  whatsappBirthdayWishes: z.boolean(),
  whatsappMedicineReminders: z.boolean(),
  whatsappPreAppointmentEnabled: z.boolean(),
  whatsappPreAppointmentMinutes: z
    .number()
    .int()
    .min(5, "Use at least 5 minutes")
    .max(180, "Use 180 minutes or less"),
});

type WhatsAppSettingsFormValues = z.infer<typeof whatsappSettingsSchema>;

export function WhatsAppAutomationSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const form = useForm<WhatsAppSettingsFormValues>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      whatsappAppointmentReminders: true,
      whatsappFollowUpMessages: true,
      whatsappBirthdayWishes: false,
      whatsappMedicineReminders: true,
      whatsappPreAppointmentEnabled: false,
      whatsappPreAppointmentMinutes: 30,
    },
  });

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      form.reset({
        whatsappAppointmentReminders: s.whatsappAppointmentReminders ?? true,
        whatsappFollowUpMessages: s.whatsappFollowUpMessages ?? true,
        whatsappBirthdayWishes: s.whatsappBirthdayWishes ?? false,
        whatsappMedicineReminders: s.whatsappMedicineReminders ?? true,
        whatsappPreAppointmentEnabled: s.whatsappPreAppointmentEnabled ?? false,
        whatsappPreAppointmentMinutes: s.whatsappPreAppointmentMinutes ?? 30,
      });
    }
  }, [clinic, form]);

  const onSubmit = (data: WhatsAppSettingsFormValues) => {
    updateSettings(data, {
      onSuccess: () => {
        toast.success("WhatsApp automation settings saved successfully");
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not save your WhatsApp automation settings. Please try again.",
          "save",
        );
      },
    });
  };

  if (isLoading) {
    return (
      <div
        className="flex justify-center p-8"
        role="status"
        aria-live="polite"
        aria-label="Loading WhatsApp automation settings"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-success" />
                <div>
                  <CardTitle>WhatsApp Automation</CardTitle>
                  <CardDescription>
                    Configure automated patient messaging
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="whatsappAppointmentReminders"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className="space-y-1">
                      <Label className="text-base">Appointment Reminders</Label>
                      <CardDescription>
                        Send reminders before appointments
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsappFollowUpMessages"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className="space-y-1">
                      <Label className="text-base">Follow-up Messages</Label>
                      <CardDescription>
                        Send follow-up reminders after visits
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsappBirthdayWishes"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className="space-y-1">
                      <Label className="text-base">Birthday Wishes</Label>
                      <CardDescription>
                        Send birthday greetings to patients
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsappMedicineReminders"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className="space-y-1">
                      <Label className="text-base">Medicine Reminders</Label>
                      <CardDescription>
                        Send medication reminders to patients
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Pre-appointment WhatsApp</CardTitle>
                  <CardDescription>
                    Send a WhatsApp message before the appointment with status
                    options for the patient
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    Enable pre-appointment message
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Patient receives a WhatsApp message before their appointment
                    and can reply with: On Time, Delayed, or Cancelled. Their
                    reply updates the appointment status and notifies the
                    doctor.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="whatsappPreAppointmentEnabled"
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

              {form.watch("whatsappPreAppointmentEnabled") ? (
                <div className="flex items-start gap-2">
                  <Label className="whitespace-nowrap pt-2 text-xs text-muted-foreground">
                    Send
                  </Label>
                  <FormField
                    control={form.control}
                    name="whatsappPreAppointmentMinutes"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            type="number"
                            min={5}
                            max={180}
                            step={5}
                            inputMode="numeric"
                            className="h-9 w-24 text-right text-sm"
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                  <span className="pt-2 text-xs text-muted-foreground">
                    minutes before appointment
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Button className="w-full" type="submit" disabled={isSaving}>
            {isSaving && <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />}
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
}
