"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WhatsAppAutomationSettings } from "@/components/settings/whatsapp-automation-settings";
import { CustomFieldsSettings } from "@/components/settings/custom-fields-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { ClinicGeneralSettings } from "@/components/settings/clinic-general-settings";
import { MemberManagementSettings } from "@/components/settings/member-management-settings";
import { PrescriptionDefaultsSettings } from "@/components/settings/prescription-defaults-settings";
import { QueueSettings } from "@/components/settings/queue-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import {
  DoctorAvailabilitySettingsDynamic,
  SubscriptionSettingsDynamic,
  TemplatesSettingsDynamic,
} from "@/lib/dynamic-imports";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function SettingsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "general";

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8 pb-24">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your clinic preferences and configurations.
        </p>
      </div>

      <Tabs
        defaultValue={defaultTab}
        className="flex flex-col md:flex-row gap-6 lg:gap-10"
      >
        <aside className="md:w-56 lg:w-64 shrink-0">
          <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 gap-1 items-stretch">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">
              Practice
            </div>
            <TabsTrigger
              value="general"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Members
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Subscription
            </TabsTrigger>

            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1 mt-4">
              Clinical
            </div>
            <TabsTrigger
              value="availability"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Availability
            </TabsTrigger>
            <TabsTrigger
              value="queue"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Queue
            </TabsTrigger>
            <TabsTrigger
              value="prescriptions"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Prescriptions
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Templates
            </TabsTrigger>

            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1 mt-4">
              Automation
            </div>
            <TabsTrigger
              value="reminders"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Reminders
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              WhatsApp
            </TabsTrigger>
            <TabsTrigger
              value="custom-fields"
              className="justify-start px-3 data-[state=active]:bg-muted"
            >
              Custom Fields
            </TabsTrigger>
          </TabsList>
        </aside>

        <div className="flex-1 min-w-0">
          <TabsContent value="general" className="mt-0 space-y-6">
            <ClinicGeneralSettings />
          </TabsContent>

          <TabsContent value="billing" className="mt-0 space-y-6">
            <BillingSettings />
          </TabsContent>

          <TabsContent value="subscription" className="mt-0 space-y-6">
            <SubscriptionSettingsDynamic />
          </TabsContent>

          <TabsContent value="members" className="mt-0 space-y-6">
            <MemberManagementSettings />
          </TabsContent>

          <TabsContent value="availability" className="mt-0 space-y-6">
            <DoctorAvailabilitySettingsDynamic />
          </TabsContent>

          <TabsContent value="queue" className="mt-0 space-y-6">
            <QueueSettings />
          </TabsContent>

          <TabsContent value="prescriptions" className="mt-0 space-y-6">
            <PrescriptionDefaultsSettings />
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <TemplatesSettingsDynamic />
          </TabsContent>

          <TabsContent value="custom-fields" className="mt-0">
            <CustomFieldsSettings />
          </TabsContent>

          <TabsContent value="reminders" className="mt-0">
            <ReminderSettings />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-0">
            <WhatsAppAutomationSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6">Loading settings...</div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
