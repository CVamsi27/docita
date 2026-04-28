"use client";

import { FeatureGuard } from "@/features/_shared/components/auth/feature-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { MessageSquare, Send, Settings, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useWhatsappStats } from "@/hooks/api/use-whatsapp";
import { useState } from "react";
import { WhatsAppBroadcastDialog } from "@/features/dialogs/components/WhatsAppBroadcastDialogContainer";
import { WhatsAppSettingsDialog } from "@/features/dialogs/components/WhatsAppSettingsDialogContainer";

export default function WhatsAppPage() {
  const { data: stats } = useWhatsappStats();
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const subscriberCount = stats?.subscribers || 0;
  const totalPatients = stats?.totalPatients || 0;
  const optInRate =
    totalPatients > 0 ? Math.round((subscriberCount / totalPatients) * 100) : 0;

  return (
    <FeatureGuard feature="WHATSAPP_MESSAGING">
      <AppPageScaffold
        className="max-w-5xl"
        header={
          <PageHeader
            title="WhatsApp Integration"
            description="Manage your facility's WhatsApp Business API settings and automation."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSettingsDialogOpen(true)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Settings
                </Button>
                <Button onClick={() => setIsBroadcastDialogOpen(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </div>
            }
          />
        }
      >
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
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
              <div className="flex items-center gap-2 text-success font-medium mb-4">
                <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
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
                Send health tips, facility updates, or holiday notices to your
                patient list.
              </p>
              <Button className="w-full" onClick={() => setIsBroadcastDialogOpen(true)}>
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
                <span className="text-success font-medium">On</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Follow-up Messages</span>
                <span className="text-success font-medium">On</span>
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
                  className="h-full bg-success"
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
      </AppPageScaffold>
    </FeatureGuard>
  );
}
