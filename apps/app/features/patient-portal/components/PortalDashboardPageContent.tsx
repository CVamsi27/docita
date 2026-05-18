"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePatientPortalDashboard } from "@/hooks/api/use-patient-portal";
import { usePatientConsentSettings } from "@/hooks/api/use-patient-portal";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import {
  CalendarCheck,
  Calendar,
  FileText,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

export default function PortalDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalDashboard();
  const { data: consentSettings } = usePatientConsentSettings();

  const whatsappConsentStatus = consentSettings?.whatsappConsent
    ? "WhatsApp granted"
    : "WhatsApp not granted";

  const summaryRows = useMemo(() => {
    if (!dashboard) return [];
    const next = dashboard.upcomingAppointments?.[0] as
      | Record<string, unknown>
      | undefined;
    const start = next?.["startTime"];
    const doctor = (next?.["doctor"] as Record<string, unknown> | undefined)?.[
      "name"
    ];
    const nextVisit =
      typeof start === "string"
        ? `Next visit · ${formatDateTime(start, "EEE, d MMM, HH:mm")}${doctor ? ` · ${String(doctor)}` : ""}`
        : dashboard.summary.upcomingAppointmentsCount > 0
          ? `Next visit · ${dashboard.summary.upcomingAppointmentsCount} scheduled`
          : "Next visit · None scheduled";

    const rx = dashboard.activePrescriptions?.[0] as
      | Record<string, unknown>
      | undefined;
    const meds = rx?.["medications"] as unknown[] | undefined;
    const firstMed =
      meds?.[0] && typeof meds[0] === "object" && meds[0] !== null
        ? (meds[0] as Record<string, unknown>)["name"]
        : undefined;
    const rxLine =
      typeof firstMed === "string"
        ? `Prescription · ${firstMed}`
        : dashboard.summary.activePrescriptionsCount > 0
          ? `Prescriptions · ${dashboard.summary.activePrescriptionsCount} active`
          : "Prescriptions · None on file";

    const inv = dashboard.outstandingInvoices?.[0] as
      | Record<string, unknown>
      | undefined;
    const invStatus = pickString(inv?.["status"]);
    const total =
      typeof inv?.["grandTotal"] === "number"
        ? inv["grandTotal"]
        : typeof inv?.["total"] === "number"
          ? inv["total"]
          : null;
    const billLine =
      total != null
        ? `Receipt · ${total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}${invStatus ? ` · ${invStatus}` : ""}`
        : dashboard.summary.outstandingInvoicesCount > 0
          ? `Bills · ${dashboard.summary.outstandingInvoicesCount} open`
          : "Bills · Nothing outstanding";

    return [
      { icon: CalendarCheck, label: nextVisit, href: "/portal/appointments" },
      { icon: FileText, label: rxLine, href: "/portal/prescriptions" },
      { icon: Receipt, label: billLine, href: "/portal/billing" },
    ];
  }, [dashboard]);

  const portalRows = useMemo(
    () => [
      ...summaryRows,
      {
        icon: ShieldCheck,
        label: `Consent · ${whatsappConsentStatus}`,
        href: "/portal/profile",
      },
    ],
    [summaryRows, whatsappConsentStatus],
  );

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Health Dashboard"
          description="Appointments, prescriptions, bills, and consent — one portal surface."
        />
      }
    >
      <DataState
        status={isLoading ? "loading" : isError ? "error" : "success"}
        loadingMessage="Loading your dashboard…"
        errorMessage="We could not load your health overview. Please try again."
        onRetry={() => void refetch()}
      >
        <Card className="border-primary/25 bg-primary/[0.04]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <MicroLabel as="p">Portal overview</MicroLabel>
              <span
                className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-success"
                aria-hidden
              />
            </div>
            <CardTitle className="text-base font-semibold text-foreground">
              At a glance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" role="list">
              {portalRows.map((row, idx) => (
                <li key={`${row.href}-${idx}`}>
                  <Link
                    href={row.href}
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
            <CardTitle className="text-base">Consent &amp; privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="ui-helper-text">
              Review consent and messaging preferences any time.
            </p>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="font-medium">WhatsApp:</span>
                <span className="ml-1 text-muted-foreground">
                  {whatsappConsentStatus}
                </span>
              </p>
              <p>
                <span className="font-medium">Data storage:</span>
                <span className="ml-1 text-muted-foreground">
                  {consentSettings?.dataStorageConsent ? "Granted" : "Not granted"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/profile/consent-form">Consent form</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/profile">Privacy settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/appointments">
                <Calendar className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Appointments
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/prescriptions">
                <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Prescriptions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/billing">
                <Receipt className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Billing
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/history">Visit history</Link>
            </Button>
          </CardContent>
        </Card>
      </DataState>
    </AppPageScaffold>
  );
}
