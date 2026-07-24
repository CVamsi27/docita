"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays, CreditCard, FileText } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@workspace/ui/components";

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
  const t = useTranslations("PatientPortal.overview");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="ui-page-title">{t("pageTitle")}</h1>
        <p className="ui-page-subtitle">{t("pageSubtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("upcomingAppointments")}
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
              {t("activePrescriptions")}
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
              {t("outstandingInvoices")}
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
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
          <div className="flex justify-center pb-6">
            <Button asChild>
              <Link href={appointmentsHref}>{t("openAppointmentsButton")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
