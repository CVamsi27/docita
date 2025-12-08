"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WhatsAppAutomationSettings } from "@/components/settings/whatsapp-automation-settings";
import { CustomFieldsSettings } from "@/components/settings/custom-fields-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { ClinicGeneralSettings } from "@/components/settings/clinic-general-settings";
import { DoctorManagementSettings } from "@/components/settings/doctor-management-settings";
import { PrescriptionDefaultsSettings } from "@/components/settings/prescription-defaults-settings";
import { QueueSettings } from "@/components/settings/queue-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import {
  SubscriptionSettingsDynamic,
  DoctorAvailabilitySettingsDynamic,
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
    <div className="container mx-auto p-4 md:p-6 space-y-8">
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

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-11">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <ClinicGeneralSettings />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <BillingSettings />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionSettingsDynamic />
        </TabsContent>

        <TabsContent value="doctors" className="space-y-6">
          <DoctorManagementSettings />
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <DoctorAvailabilitySettingsDynamic />
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <QueueSettings />
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-6">
          <PrescriptionDefaultsSettings />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesSettingsDynamic />
        </TabsContent>

        <TabsContent value="custom-fields">
          <CustomFieldsSettings />
        </TabsContent>

        <TabsContent value="reminders">
          <ReminderSettings />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppAutomationSettings />
        </TabsContent>
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
