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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { Bell, Smartphone } from "lucide-react";
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
} from "@workspace/ui/components/form";

const notificationSettingsSchema = z.object({
  whatsappNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
});

type NotificationSettingsFormValues = z.infer<
  typeof notificationSettingsSchema
>;

export function NotificationSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      whatsappNotifications: true,
      inAppNotifications: true,
    },
  });

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      const whatsappFromSettings =
        s.whatsappNotifications ??
        s.whatsappAppointmentReminders ??
        s.whatsappFollowUpMessages ??
        s.whatsappBirthdayWishes ??
        s.whatsappMedicineReminders ??
        true;

      form.reset({
        whatsappNotifications: whatsappFromSettings,
        inAppNotifications: s.inAppNotifications ?? s.pushNotifications ?? true,
      });
    }
  }, [clinic, form]);

  const onSubmit = (data: NotificationSettingsFormValues) => {
    updateSettings(
      {
        pushNotifications: data.inAppNotifications,
        whatsappAppointmentReminders: data.whatsappNotifications,
      },
      {
        onSuccess: () => {
          toast.success("Notification preferences saved successfully");
        },
        onError: (error) => {
          showUserFacingErrorToast(
            error,
            "We could not save your notification settings. Please try again.",
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
        aria-label="Loading notification settings"
      >
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-warning" />
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="whatsappNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 p-2">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <Label className="text-base">
                          WhatsApp Notifications
                        </Label>
                        <CardDescription>
                          Receive WhatsApp updates and reminders
                        </CardDescription>
                      </div>
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
                name="inAppNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 p-2">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <Label className="text-base">
                          In-App Notifications
                        </Label>
                        <CardDescription>
                          Show real-time alerts inside the app
                        </CardDescription>
                      </div>
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

              <Button className="w-full" type="submit" disabled={isSaving}>
                {isSaving && <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />}
                Save Preferences
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
