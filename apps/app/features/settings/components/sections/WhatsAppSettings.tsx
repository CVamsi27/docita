"use client";

import { useState } from "react";
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
import { MessageSquare } from "lucide-react";

export function WhatsAppAutomationSettings() {
  const [settings, setSettings] = useState({
    appointmentReminders: true,
    followUpMessages: true,
    birthdayWishes: false,
    medicineReminders: true,
  });

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
              checked={settings.appointmentReminders}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, appointmentReminders: checked }))
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
              checked={settings.followUpMessages}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, followUpMessages: checked }))
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
              checked={settings.birthdayWishes}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, birthdayWishes: checked }))
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
              checked={settings.medicineReminders}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, medicineReminders: checked }))
              }
            />
          </div>
          <Button className="w-full">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
