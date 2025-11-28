"use client"

import { WhatsAppAutomationSettings } from "@/components/settings/whatsapp-automation-settings"
import { TemplatesSettings } from "@/components/settings/templates-settings"
import { CustomFieldsSettings } from "@/components/settings/custom-fields-settings"
import { ReminderSettings } from "@/components/settings/reminder-settings"
import { ClinicGeneralSettings } from "@/components/settings/clinic-general-settings"
import { DoctorManagementSettings } from "@/components/settings/doctor-management-settings"
import { PrescriptionDefaultsSettings } from "@/components/settings/prescription-defaults-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <ClinicGeneralSettings />
        </TabsContent>

        <TabsContent value="doctors" className="space-y-6">
          <DoctorManagementSettings />
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-6">
          <PrescriptionDefaultsSettings />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesSettings />
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
  )
}
