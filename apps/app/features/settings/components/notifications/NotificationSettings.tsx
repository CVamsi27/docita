"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  notificationSettingsFormSchema,
  type NotificationSettingsFormValues,
} from "@workspace/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { Label } from "@workspace/ui/components/form/label";
import { Switch } from "@workspace/ui/components/form/switch";
import { Button } from "@workspace/ui/components/form/button";
import { Bell, Smartphone } from "lucide-react";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@workspace/data-access";
import { parseClinicAppSettings } from "@/lib/clinic/parse-clinic-app-settings";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@workspace/ui/components/form/form";
import Link from "next/link";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { Feature } from "@workspace/types";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export function NotificationSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();
  const canWhatsApp = usePermissionStore((s) =>
    s.canAccess(Feature.WHATSAPP_MESSAGING),
  );

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsFormSchema),
    defaultValues: {
      whatsappNotifications: true,
      inAppNotifications: true,
    },
  });

  useEffect(() => {
    if (clinic) {
      const s = parseClinicAppSettings(clinic.settings);
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
        ...(canWhatsApp && data.whatsappNotifications !== undefined
          ? { whatsappAppointmentReminders: data.whatsappNotifications }
          : {}),
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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-warning" />
            <div>
              <CardTitle>Notification preferences</CardTitle>
              <CardDescription>
                Choose how the workspace nudges you.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-5"
            >
              {canWhatsApp ? (
                <FormField
                  control={form.control}
                  name="whatsappNotifications"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
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
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex flex-col gap-2 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      WhatsApp notifications
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp messaging is available on Essential and higher
                    plans. Upgrade to enable automated WhatsApp reminders from
                    this workspace.
                  </p>
                  <Link
                    href={SUBSCRIPTION_SETTINGS_PATH}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View plans and billing
                  </Link>
                </div>
              )}

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

              <div className="flex justify-end border-t border-border/60 pt-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  )}
                  Save preferences
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
