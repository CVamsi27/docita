"use client";

import Link from "next/link";
import { usePatientPortalDashboard } from "@/hooks/api/use-patient-portal";
import { usePatientConsentSettings } from "@/hooks/api/use-patient-portal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Calendar, FileText, Receipt } from "lucide-react";

export default function PortalDashboardPage() {
  const { data: dashboard, isLoading } = usePatientPortalDashboard();
  const { data: consentSettings } = usePatientConsentSettings();

  const whatsappConsentStatus = consentSettings?.whatsappConsent
    ? "Granted"
    : "Not Granted";

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Health Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.summary.upcomingAppointmentsCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Prescriptions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.summary.activePrescriptionsCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Invoices
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.summary.outstandingInvoicesCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent & Data Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Review your consent form and privacy preferences.
          </p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="font-medium">WhatsApp Consent:</span>{" "}
              {whatsappConsentStatus}
            </p>
            <p>
              <span className="font-medium">Data Storage Consent:</span> Granted
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/profile/consent-form">View Consent Form</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/profile">Privacy Settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
