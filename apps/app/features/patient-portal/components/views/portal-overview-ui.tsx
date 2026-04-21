"use client";

import Link from "next/link";
import { CalendarDays, CreditCard, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { EmptyState } from "@workspace/ui/components/empty-state";

interface PatientPortalOverviewUIProps {
  appointmentCount: number;
  prescriptionCount: number;
  outstandingInvoiceCount: number;
  appointmentsHref?: string;
}

export function PatientPortalOverviewUI({
  appointmentCount,
  prescriptionCount,
  outstandingInvoiceCount,
  appointmentsHref = "/portal/appointments",
}: PatientPortalOverviewUIProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Patient Portal
        </h1>
        <p className="text-sm text-muted-foreground">
          View your care journey, prescriptions, and billing in one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-semibold">{appointmentCount}</span>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-semibold">{prescriptionCount}</span>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-semibold">
              {outstandingInvoiceCount}
            </span>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <EmptyState
            icon={CalendarDays}
            title="No upcoming appointments yet"
            description="Book your next visit to get started with the portal experience"
          />
          <div className="flex justify-center pb-6">
            <Button asChild>
              <Link href={appointmentsHref}>Open Appointments</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
