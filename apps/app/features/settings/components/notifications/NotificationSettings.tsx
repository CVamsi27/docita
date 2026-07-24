"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notificationSettingsFormSchema, type NotificationSettingsFormValues } from "@workspace/types";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Form } from "@workspace/ui/components";
import { Bell } from "lucide-react";
import { useClinicSettings, useUpdateClinicSettings } from "@workspace/data-access";
import { parseClinicAppSettings } from "@/lib/clinic/parse-clinic-app-settings";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { Feature } from "@workspace/types";
import { NotificationSettingsLoadingCard } from "./notification-settings-loading-card";
import { WhatsAppNotificationSection, InAppNotificationSection } from "./NotificationSettings.sections";

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

  if (isLoading) return <NotificationSettingsLoadingCard />;

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
              <WhatsAppNotificationSection form={form} canWhatsApp={canWhatsApp} />
              <InAppNotificationSection form={form} />

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
