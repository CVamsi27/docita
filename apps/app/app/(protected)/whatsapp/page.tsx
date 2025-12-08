"use client";

import { FeatureGuard } from "@/components/auth/feature-guard";
import { Feature } from "@/lib/stores/permission-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { MessageSquare, Send, Settings, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { apiHooks } from "@/lib/api-hooks";
import { useState } from "react";
import { WhatsAppBroadcastDialog } from "@/components/dialogs/whatsapp-broadcast-dialog";
import { WhatsAppSettingsDialog } from "@/components/dialogs/whatsapp-settings-dialog";

export default function WhatsAppPage() {
  const { data: patients = [] } = apiHooks.usePatients();
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Count patients with phone numbers as potential WhatsApp subscribers
  const patientsWithPhone = patients.filter(
    (p) => p.phoneNumber && p.phoneNumber.trim() !== "",
  );
  const subscriberCount = patientsWithPhone.length;
  const optInRate =
    patients.length > 0
      ? Math.round((subscriberCount / patients.length) * 100)
      : 0;

  return (
    <FeatureGuard feature={Feature.WHATSAPP_API}>
      <div className="flex-1 space-y-6 max-w-4xl mx-auto p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            WhatsApp Integration
          </h1>
          <p className="text-muted-foreground">
            Manage your clinic&apos;s WhatsApp Business API settings and
            automation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Bot Status
              </CardTitle>
              <CardDescription>
                Monitor your automated assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-green-600 font-medium mb-4">
                <div className="h-2.5 w-2.5 rounded-full bg-green-600 animate-pulse" />
                Active
              </div>
              <p className="text-sm text-muted-foreground">
                Your bot is currently handling patient queries, appointment
                confirmations, and reminders.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Quick Broadcast
              </CardTitle>
              <CardDescription>Send announcements to patients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send health tips, clinic updates, or holiday notices to your
                patient list.
              </p>
              <Button
                className="w-full"
                onClick={() => setIsBroadcastDialogOpen(true)}
              >
                Create Campaign
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>Manage templates and triggers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span>Appointment Reminders</span>
                <span className="text-green-600 font-medium">On</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Follow-up Messages</span>
                <span className="text-green-600 font-medium">On</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Birthday Wishes</span>
                <span className="text-muted-foreground">Off</span>
              </div>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setIsSettingsDialogOpen(true)}
              >
                Manage Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subscribers
              </CardTitle>
              <CardDescription>Patient opt-in status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {subscriberCount.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">
                Patients with phone numbers
              </p>
              <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${optInRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {optInRate}% have phone numbers
              </p>
            </CardContent>
          </Card>
        </div>

        <WhatsAppBroadcastDialog
          isOpen={isBroadcastDialogOpen}
          onClose={() => setIsBroadcastDialogOpen(false)}
          onSuccess={() => setIsBroadcastDialogOpen(false)}
        />

        <WhatsAppSettingsDialog
          isOpen={isSettingsDialogOpen}
          onClose={() => setIsSettingsDialogOpen(false)}
          onSuccess={() => setIsSettingsDialogOpen(false)}
        />
      </div>
    </FeatureGuard>
  );
}
