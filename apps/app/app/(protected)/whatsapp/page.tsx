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
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { useWhatsappStats } from "@/hooks/api/use-whatsapp";
import { useState } from "react";
import { WhatsAppBroadcastDialog } from "@/features/dialogs/components/WhatsAppBroadcastDialogContainer";
import { WhatsAppSettingsDialog } from "@/features/dialogs/components/WhatsAppSettingsDialogContainer";
import { StatTile } from "@workspace/ui";
import { formatCountLocale } from "@workspace/utils";
import { whatsappOptInRatePercent } from "@/features/whatsapp/lib/whatsapp-opt-in-rate";

export default function WhatsAppPage() {
  const { data: stats, isLoading, isError, refetch } = useWhatsappStats();
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const subscriberCount = stats?.subscribers || 0;
  const totalPatients = stats?.totalPatients || 0;
  const optInRate = whatsappOptInRatePercent(subscriberCount, totalPatients);

  const header = (
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
  );

  return (
    <FeatureGuard feature="WHATSAPP_MESSAGING">
      <AppPageScaffold className="max-w-5xl" header={header}>
        {isLoading && !stats ? (
          <DataState
            status="loading"
            loadingMessage="Loading WhatsApp stats…"
          />
        ) : null}

        {isError ? (
          <DataState
            status="error"
            className="min-h-[40vh]"
            errorMessage="We could not load WhatsApp stats. Please try again."
            onRetry={() => refetch()}
          />
        ) : null}

        {!isLoading && !isError && stats && totalPatients === 0 ? (
          <Alert className="mb-4 border-info/40 bg-info/10">
            <AlertTitle>No patients on file yet</AlertTitle>
            <AlertDescription>
              Add patients with mobile numbers to reach them on WhatsApp. Use{" "}
              <span className="font-medium text-foreground">
                Manage Settings
              </span>{" "}
              when your Meta Business integration is ready.
            </AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !isError ? (
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
              <p className="ui-helper-text">
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
              <p className="ui-helper-text">
                Send health tips, facility updates, or holiday notices to your
                patient list. Use the
                <span className="mx-1 font-medium text-foreground">
                  Create Campaign
                </span>
                control above when you are ready.
              </p>
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
              <p className="ui-helper-text pt-1">
                Open
                <span className="mx-1 font-medium text-foreground">
                  Manage Settings
                </span>
                above to change templates and triggers.
              </p>
            </CardContent>
          </Card>

          <StatTile
            label="Subscribers"
            value={formatCountLocale(subscriberCount)}
            description="Patients with phone numbers on file"
            icon={<Users className="h-4 w-4" aria-hidden />}
            footer={
              <>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-success"
                    style={{ width: `${optInRate}%` }}
                  />
                </div>
                <p className="ui-helper-text mt-1 text-[var(--fs-xs)]">
                  {optInRate}% have phone numbers
                </p>
              </>
            }
          />
        </div>
        ) : null}

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
