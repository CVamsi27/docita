"use client";

import { Link } from "react-router";
import { useMemo } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, MicroLabel } from "@workspace/ui/components";
import { ShieldCheck, CalendarCheck, FileText, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/formatters";
import { formatCurrency, isRecord } from "@workspace/utils";

interface DashboardSummary {
  upcomingAppointmentsCount: number;
  activePrescriptionsCount: number;
  outstandingInvoicesCount: number;
  totalOutstandingAmount: number;
}

interface PortalMetricsCardsProps {
  dashboard?: {
    patient: Record<string, unknown>;
    summary: DashboardSummary;
    upcomingAppointments: Record<string, unknown>[];
    activePrescriptions: Record<string, unknown>[];
    outstandingInvoices: Record<string, unknown>[];
  } | null;
  whatsappConsentStatus: string;
  consentSettings?: { whatsappConsent: boolean; dataStorageConsent: boolean } | null;
}

function usePortalMetricsTranslations() {
  return useTranslation("PatientPortal");
}

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

export function PortalMetricsCards({
  dashboard,
  whatsappConsentStatus,
  consentSettings,
}: PortalMetricsCardsProps) {
  const { t } = usePortalMetricsTranslations();
  const summaryRows = useMemo(() => {
    if (!dashboard) return [];
    const nextRaw = dashboard.upcomingAppointments?.[0];
    const next = isRecord(nextRaw) ? nextRaw : undefined;
    const start = next?.startTime;
    const doctorRecord = isRecord(next?.doctor) ? next.doctor : undefined;
    const doctor = doctorRecord?.name;
    const nextVisit =
      typeof start === "string"
        ? t("metricsCards.nextVisitLine", {
            time: formatDateTime(start, "EEE, d MMM, HH:mm"),
            doctor: doctor ? ` · ${String(doctor)}` : "",
          })
        : dashboard.summary.upcomingAppointmentsCount > 0
          ? t("metricsCards.nextVisitCount", { count: dashboard.summary.upcomingAppointmentsCount })
          : t("metricsCards.nextVisitNone");

    const rxRaw = dashboard.activePrescriptions?.[0];
    const rx = isRecord(rxRaw) ? rxRaw : undefined;
    const meds = Array.isArray(rx?.medications) ? rx.medications : undefined;
    const firstMedRaw = meds?.[0];
    const firstMed =
      isRecord(firstMedRaw) && typeof firstMedRaw.name === "string"
        ? firstMedRaw.name
        : undefined;
    const rxLine =
      typeof firstMed === "string"
        ? t("metricsCards.prescriptionWithMed", { med: firstMed })
        : dashboard.summary.activePrescriptionsCount > 0
          ? t("metricsCards.prescriptionCount", { count: dashboard.summary.activePrescriptionsCount })
          : t("metricsCards.prescriptionNone");

    const invRaw = dashboard.outstandingInvoices?.[0];
    const inv = isRecord(invRaw) ? invRaw : undefined;
    const invStatus = pickString(inv?.status);
    const total =
      typeof inv?.grandTotal === "number"
        ? inv.grandTotal
        : typeof inv?.total === "number"
          ? inv.total
          : null;
    const billLine =
      total != null
        ? t("metricsCards.receiptLine", {
            amount: formatCurrency(total, { currency: "INR" }),
            status: invStatus ? ` · ${invStatus}` : "",
          })
        : dashboard.summary.outstandingInvoicesCount > 0
          ? t("metricsCards.billsCount", { count: dashboard.summary.outstandingInvoicesCount })
          : t("metricsCards.billsNone");

    return [
      { icon: CalendarCheck, label: nextVisit, href: "/portal/appointments" },
      { icon: FileText, label: rxLine, href: "/portal/prescriptions" },
      { icon: Receipt, label: billLine, href: "/portal/billing" },
    ];
  }, [dashboard, t]);

  const portalRows = useMemo(
    () => [
      ...summaryRows,
      {
        icon: ShieldCheck,
        label: t("metricsCards.consentLine", { status: whatsappConsentStatus }),
        href: "/portal/profile",
      },
    ],
    [summaryRows, whatsappConsentStatus, t],
  );

  return (
    <>
      <Card className="border-primary/25 bg-primary/[0.04]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <MicroLabel as="p">{t("metricsCards.overviewMicroLabel")}</MicroLabel>
            <span
              className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-success"
              aria-hidden
            />
          </div>
          <CardTitle className="text-base font-semibold text-foreground">
            {t("metricsCards.atAGlanceTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2" role="list">
            {portalRows.map((row, idx) => (
              <li key={`${row.href}-${idx}`}>
                <Link
                  to={row.href}
                  className="flex items-center gap-2 rounded-md border border-border/40 bg-muted px-2.5 py-1.5 text-xs text-foreground transition-colors duration-150 hover:bg-muted/80"
                >
                  <row.icon
                    className="h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t("metricsCards.consentTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="ui-helper-text">
            {t("metricsCards.consentHelper")}
          </p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="font-medium">{t("metricsCards.whatsAppLabel")}</span>
              <span className="ml-1 text-muted-foreground">
                {whatsappConsentStatus}
              </span>
            </p>
            <p>
              <span className="font-medium">{t("metricsCards.dataStorageLabel")}</span>
              <span className="ml-1 text-muted-foreground">
                {consentSettings?.dataStorageConsent
                  ? t("metricsCards.grantedValue")
                  : t("metricsCards.notGrantedValue")}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/profile/consent-form">{t("metricsCards.consentFormButton")}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/profile">{t("metricsCards.privacySettingsButton")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
