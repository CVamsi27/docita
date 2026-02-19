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
import { Bell, Loader2, Smartphone } from "lucide-react";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@workspace/ui/components/form";

const notificationSettingsSchema = z.object({
  whatsappNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  appointmentAlerts: z.boolean(),
  reportAlerts: z.boolean(),
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
      appointmentAlerts: true,
      reportAlerts: true,
    },
  });

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      form.reset({
        whatsappNotifications: s.whatsappNotifications ?? true,
        inAppNotifications:
          s.inAppNotifications ??
          s.pushNotifications ??
          true,
        appointmentAlerts: s.appointmentAlerts ?? true,
        reportAlerts: s.reportAlerts ?? true,
      });
    }
  }, [clinic, form]);

  const onSubmit = (data: NotificationSettingsFormValues) => {
    updateSettings(data, {
      onSuccess: () => {
        toast.success("Notification preferences saved successfully");
      },
      onError: (error) => {
        toast.error(`Failed to save preferences: ${error.message}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600" />
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
                        <Label className="text-base">WhatsApp Notifications</Label>
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
                        <Label className="text-base">In-App Notifications</Label>
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
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
