"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Bell, Loader2, Mail, MessageSquare, Save } from "lucide-react";
import { API_URL } from "@/lib/api";

interface ReminderSettings {
  id: string;
  enabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  hoursBeforeAppt: number;
  smsTemplate: string;
  emailTemplate: string;
  emailSubject: string;
}

export function ReminderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const hasFetchedRef = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/reminders/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          id: data.id ?? "",
          enabled: data.enabled ?? false,
          smsEnabled: data.smsEnabled ?? false,
          emailEnabled: data.emailEnabled ?? false,
          hoursBeforeAppt: data.hoursBeforeAppt ?? 24,
          smsTemplate: data.smsTemplate ?? "",
          emailTemplate: data.emailTemplate ?? "",
          emailSubject: data.emailSubject ?? "",
        });
      }
    } catch (error) {
      console.error("Failed to load reminder settings", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useSyncExternalStore to trigger initial fetch
  useSyncExternalStore(
    useCallback(() => {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        loadSettings();
      }
      return () => {};
    }, [loadSettings]),
    () => settings,
    () => null,
  );

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/reminders/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Failed to save settings", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appointment Reminders</h3>
        <p className="text-sm text-muted-foreground">
          Configure automated reminders for upcoming appointments
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Enable or disable appointment reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send reminders for upcoming appointments
              </p>
            </div>
            <Checkbox
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">
              Send Reminder (Hours Before Appointment)
            </Label>
            <Input
              id="hours"
              type="number"
              min="1"
              max="168"
              value={settings.hoursBeforeAppt}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  hoursBeforeAppt: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Reminders will be sent {settings.hoursBeforeAppt} hours before the
              appointment
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Reminders
          </CardTitle>
          <CardDescription>Configure email reminder templates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailEnabled">Enable Email Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send email reminders to patients
              </p>
            </div>
            <Checkbox
              id="emailEnabled"
              checked={settings.emailEnabled}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, emailEnabled: checked })
              }
            />
          </div>

          {settings.emailEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="emailSubject">Email Subject</Label>
                <Input
                  id="emailSubject"
                  value={settings.emailSubject}
                  onChange={(e) =>
                    setSettings({ ...settings, emailSubject: e.target.value })
                  }
                  placeholder="Appointment Reminder - {clinicName}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailTemplate">Email Template</Label>
                <Textarea
                  id="emailTemplate"
                  rows={10}
                  value={settings.emailTemplate || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, emailTemplate: e.target.value })
                  }
                  placeholder="Email message template..."
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: {"{patientName}"}, {"{doctorName}"},{" "}
                  {"{appointmentDate}"}, {"{appointmentTime}"},{" "}
                  {"{appointmentType}"}, {"{clinicName}"}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SMS Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Reminders
          </CardTitle>
          <CardDescription>Configure SMS reminder templates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smsEnabled">Enable SMS Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send SMS reminders to patients (requires Twilio integration)
              </p>
            </div>
            <Checkbox
              id="smsEnabled"
              checked={settings.smsEnabled}
              onCheckedChange={(checked: boolean) =>
                setSettings({ ...settings, smsEnabled: checked })
              }
            />
          </div>

          {settings.smsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="smsTemplate">SMS Template</Label>
              <Textarea
                id="smsTemplate"
                rows={4}
                value={settings.smsTemplate || ""}
                onChange={(e) =>
                  setSettings({ ...settings, smsTemplate: e.target.value })
                }
                placeholder="SMS message template (keep it short)..."
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                SMS messages should be under 160 characters. Available
                placeholders: {"{patientName}"}, {"{doctorName}"},{" "}
                {"{appointmentDate}"}, {"{appointmentTime}"}, {"{clinicName}"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
