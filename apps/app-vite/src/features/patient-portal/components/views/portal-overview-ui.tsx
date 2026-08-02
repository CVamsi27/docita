"use client";

import { Link } from "react-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("PatientPortal");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="ui-page-title">{t("overview.pageTitle")}</h1>
        <p className="ui-page-subtitle">{t("overview.pageSubtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("overview.upcomingAppointments")}
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
              {t("overview.activePrescriptions")}
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
              {t("overview.outstandingInvoices")}
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
            title={t("overview.emptyTitle")}
            description={t("overview.emptyDescription")}
          />
          <div className="flex justify-center pb-6">
            <Button asChild>
              <Link to={appointmentsHref}>{t("overview.openAppointmentsButton")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
