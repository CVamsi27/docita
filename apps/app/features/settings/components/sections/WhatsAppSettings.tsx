import { useEffect, useState } from "react";
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

export function WhatsAppAutomationSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const [settings, setSettings] = useState<ClinicAppSettings>({
    whatsappAppointmentReminders: true,
    whatsappFollowUpMessages: true,
    whatsappBirthdayWishes: false,
    whatsappMedicineReminders: true,
  });

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      setSettings({
        whatsappAppointmentReminders: s.whatsappAppointmentReminders ?? true,
        whatsappFollowUpMessages: s.whatsappFollowUpMessages ?? true,
        whatsappBirthdayWishes: s.whatsappBirthdayWishes ?? false,
        whatsappMedicineReminders: s.whatsappMedicineReminders ?? true,
      });
    }
  }, [clinic]);

  const handleSave = () => {
    updateSettings(
      {
        whatsappAppointmentReminders: settings.whatsappAppointmentReminders,
        whatsappFollowUpMessages: settings.whatsappFollowUpMessages,
        whatsappBirthdayWishes: settings.whatsappBirthdayWishes,
        whatsappMedicineReminders: settings.whatsappMedicineReminders,
      },
      {
        onSuccess: () => {
          toast.success("WhatsApp automation settings saved successfully");
        },
        onError: (error) => {
          toast.error(`Failed to save settings: ${error.message}`);
        },
      }
    );
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
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Appointment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send reminders before appointments
              </p>
            </div>
            <Switch
              checked={settings.whatsappAppointmentReminders}
              onCheckedChange={(checked) =>
                setSettings((s) => ({
                  ...s,
                  whatsappAppointmentReminders: checked,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Follow-up Messages</Label>
              <p className="text-sm text-muted-foreground">
                Send follow-up reminders after visits
              </p>
            </div>
            <Switch
              checked={settings.whatsappFollowUpMessages}
              onCheckedChange={(checked) =>
                setSettings((s) => ({
                  ...s,
                  whatsappFollowUpMessages: checked,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Birthday Wishes</Label>
              <p className="text-sm text-muted-foreground">
                Send birthday greetings to patients
              </p>
            </div>
            <Switch
              checked={settings.whatsappBirthdayWishes}
              onCheckedChange={(checked) =>
                setSettings((s) => ({
                  ...s,
                  whatsappBirthdayWishes: checked,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Medicine Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send medication reminders to patients
              </p>
            </div>
            <Switch
              checked={settings.whatsappMedicineReminders}
              onCheckedChange={(checked) =>
                setSettings((s) => ({
                  ...s,
                  whatsappMedicineReminders: checked,
                }))
              }
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
