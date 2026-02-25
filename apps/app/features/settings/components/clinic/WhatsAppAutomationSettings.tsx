"use client";

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
import { Loader2, MessageSquare } from "lucide-react";
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

const whatsappSettingsSchema = z.object({
  whatsappAppointmentReminders: z.boolean(),
  whatsappFollowUpMessages: z.boolean(),
  whatsappBirthdayWishes: z.boolean(),
  whatsappMedicineReminders: z.boolean(),
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
      });
    }
  }, [clinic, form]);

  const onSubmit = (data: WhatsAppSettingsFormValues) => {
    updateSettings(data, {
      onSuccess: () => {
        toast.success("WhatsApp automation settings saved successfully");
      },
      onError: (error) => {
        toast.error(`Failed to save settings: ${error.message}`);
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
            <MessageSquare className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle>WhatsApp Automation</CardTitle>
              <CardDescription>
                Configure automated patient messaging
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

              <Button className="w-full" type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
