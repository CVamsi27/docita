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
import {
  type ClinicAppSettings,
  useClinicSettings,
} from "@/hooks/api/use-settings";
import { useState } from "react";
import { WhatsAppBroadcastDialog } from "@/features/dialogs/components/WhatsAppBroadcastDialogContainer";
import { WhatsAppSettingsDialog } from "@/features/dialogs/components/WhatsAppSettingsDialogContainer";
import { StatTile } from "@workspace/ui";
import { formatCountLocale } from "@workspace/utils";
import { whatsappOptInRatePercent } from "@/features/whatsapp/lib/whatsapp-opt-in-rate";

export default function WhatsAppPage() {
  const { data: stats, isLoading, isError, refetch } = useWhatsappStats();
  const { data: clinic } = useClinicSettings();
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const subscriberCount = stats?.subscribers || 0;
  const totalPatients = stats?.totalPatients || 0;
  const optInRate = whatsappOptInRatePercent(subscriberCount, totalPatients);
  const clinicSettings = (clinic?.settings as ClinicAppSettings | undefined) ?? {};
  const reminderToggles: Array<{ label: string; enabled: boolean }> = [
    {
      label: "Appointment reminders",
      enabled: clinicSettings.whatsappAppointmentReminders ?? true,
    },
    {
      label: "Follow-up messages",
      enabled: clinicSettings.whatsappFollowUpMessages ?? true,
    },
    {
      label: "Birthday wishes",
      enabled: clinicSettings.whatsappBirthdayWishes ?? false,
    },
    {
      label: "Medicine reminders",
      enabled: clinicSettings.whatsappMedicineReminders ?? true,
    },
  ];

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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-success">
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                <span className="text-sm font-medium">Active</span>
              </div>
              <p className="ui-helper-text">
                Your bot handles patient queries, appointment confirmations,
                and reminders based on the templates configured in WhatsApp
                automation settings.
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
                patient list. Use{" "}
                <span className="font-medium text-foreground">
                  Create Campaign
                </span>{" "}
                above when you are ready.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>Templates and triggers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reminderToggles.map((toggle) => (
                <div
                  key={toggle.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{toggle.label}</span>
                  <span
                    className={
                      toggle.enabled
                        ? "font-medium text-success"
                        : "text-muted-foreground"
                    }
                  >
                    {toggle.enabled ? "On" : "Off"}
                  </span>
                </div>
              ))}
              <p className="ui-helper-text pt-1">
                Open{" "}
                <span className="font-medium text-foreground">
                  Manage Settings
                </span>{" "}
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
