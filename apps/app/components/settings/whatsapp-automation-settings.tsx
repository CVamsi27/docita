"use client";

import { useState, useCallback, useRef, useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { MessageSquare, Bell, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface AutomationSettings {
  appointmentReminders: boolean;
  reminderHoursBefore: number;
  followUpMessages: boolean;
  followUpDaysAfter: number;
  noShowPrevention: boolean;
  confirmationRequired: boolean;
  reminderTemplate: string;
  followUpTemplate: string;
}

export function WhatsAppAutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettings>({
    appointmentReminders: true,
    reminderHoursBefore: 24,
    followUpMessages: false,
    followUpDaysAfter: 3,
    noShowPrevention: true,
    confirmationRequired: true,
    reminderTemplate:
      "Hi {patientName}, this is a reminder for your appointment tomorrow at {time} with Dr. {doctorName}. Please reply CONFIRM or CANCEL.",
    followUpTemplate:
      "Hi {patientName}, this is a follow-up message regarding your recent visit. How are you feeling? Please let us know if you need any assistance.",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasFetchedRef = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch<AutomationSettings>(
        `/settings/whatsapp-automation`,
        { showErrorToast: false },
      );
      setSettings((prev) => ({
        appointmentReminders:
          data.appointmentReminders ?? prev.appointmentReminders,
        reminderHoursBefore:
          data.reminderHoursBefore ?? prev.reminderHoursBefore,
        followUpMessages: data.followUpMessages ?? prev.followUpMessages,
        followUpDaysAfter: data.followUpDaysAfter ?? prev.followUpDaysAfter,
        noShowPrevention: data.noShowPrevention ?? prev.noShowPrevention,
        confirmationRequired:
          data.confirmationRequired ?? prev.confirmationRequired,
        reminderTemplate: data.reminderTemplate ?? prev.reminderTemplate,
        followUpTemplate: data.followUpTemplate ?? prev.followUpTemplate,
      }));
    } catch (error) {
      console.error("Failed to load settings:", error);
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
    () => settings,
  );

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch(`/settings/whatsapp-automation`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          WhatsApp Automation
        </h2>
        <p className="text-muted-foreground">
          Configure automated messages and reminders for patients.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appointment Reminders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Appointment Reminders</CardTitle>
              </div>
              <input
                type="checkbox"
                checked={settings.appointmentReminders}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    appointmentReminders: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
            </div>
            <CardDescription>
              Send automatic reminders before appointments
            </CardDescription>
          </CardHeader>
          {settings.appointmentReminders && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reminder-hours">
                  Send reminder (hours before)
                </Label>
                <Input
                  id="reminder-hours"
                  type="number"
                  min="1"
                  max="72"
                  value={settings.reminderHoursBefore}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reminderHoursBefore: parseInt(e.target.value) || 24,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder-template">Message Template</Label>
                <Textarea
                  id="reminder-template"
                  value={settings.reminderTemplate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reminderTemplate: e.target.value,
                    })
                  }
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {"{patientName}"}, {"{time}"}, {"{doctorName}"}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* No-Show Prevention */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <CardTitle>No-Show Prevention</CardTitle>
              </div>
              <input
                type="checkbox"
                checked={settings.noShowPrevention}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    noShowPrevention: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
            </div>
            <CardDescription>
              Require confirmation to prevent no-shows
            </CardDescription>
          </CardHeader>
          {settings.noShowPrevention && (
            <CardContent>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="confirmation-required"
                  checked={settings.confirmationRequired}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      confirmationRequired: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="confirmation-required">
                  Require patient confirmation
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Patients must reply CONFIRM or CANCEL to the reminder message
              </p>
            </CardContent>
          )}
        </Card>

        {/* Follow-up Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Auto Follow-up Messages</CardTitle>
              </div>
              <input
                type="checkbox"
                checked={settings.followUpMessages}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    followUpMessages: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
            </div>
            <CardDescription>
              Send follow-up messages after appointments
            </CardDescription>
          </CardHeader>
          {settings.followUpMessages && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="followup-days">
                  Send follow-up (days after)
                </Label>
                <Input
                  id="followup-days"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.followUpDaysAfter}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      followUpDaysAfter: parseInt(e.target.value) || 3,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followup-template">Message Template</Label>
                <Textarea
                  id="followup-template"
                  value={settings.followUpTemplate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      followUpTemplate: e.target.value,
                    })
                  }
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {"{patientName}"}, {"{doctorName}"}
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-2">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Saved
          </Badge>
        )}
      </div>
    </div>
  );
}
