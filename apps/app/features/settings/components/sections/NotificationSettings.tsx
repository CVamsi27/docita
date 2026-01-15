import { useState, useEffect } from "react";
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
import { Bell, Mail, Smartphone, Loader2 } from "lucide-react";
import { useClinicSettings, useUpdateClinicSettings } from "@/hooks/api/use-settings";
import { toast } from "sonner";

export function NotificationSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateClinicSettings();

  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    appointmentAlerts: true,
    reportAlerts: true,
  });

  useEffect(() => {
    if (clinic) {
      const s = clinic.settings as Record<string, any> || {};
      setSettings({
        emailNotifications: s.emailNotifications ?? true,
        smsNotifications: s.smsNotifications ?? false,
        pushNotifications: s.pushNotifications ?? true,
        appointmentAlerts: s.appointmentAlerts ?? true,
        reportAlerts: s.reportAlerts ?? true,
      });
    }
  }, [clinic]);

  const handleSave = () => {
    updateSettings(
      {
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
        pushNotifications: settings.pushNotifications,
        appointmentAlerts: settings.appointmentAlerts,
        reportAlerts: settings.reportAlerts,
      } as any,
      {
        onSuccess: () => {
          toast.success("Notification preferences saved successfully");
        },
        onError: (error) => {
          toast.error(`Failed to save preferences: ${error.message}`);
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
            <Bell className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, emailNotifications: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive SMS alerts
                </p>
              </div>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, smsNotifications: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Browser push notifications
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, pushNotifications: checked }))
              }
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
