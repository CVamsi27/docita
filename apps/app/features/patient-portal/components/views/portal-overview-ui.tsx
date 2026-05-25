"use client";

import Link from "next/link";
import { CalendarDays, CreditCard, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";

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
        <h1 className="ui-page-title">Patient Portal</h1>
        <p className="ui-page-subtitle">
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
            <span className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {appointmentCount}
            </span>
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
            <span className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {prescriptionCount}
            </span>
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
            <span className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
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
