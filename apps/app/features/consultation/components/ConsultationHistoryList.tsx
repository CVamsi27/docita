"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  ClipboardList,
  Eye,
  FileText,
  Pill,
  Receipt,
} from "lucide-react";
import { useAppointments } from "@workspace/data-access";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatLocaleDateShortMonthYear, formatTime } from "@/lib/formatters";
import { usePermissions } from "@/hooks/use-permissions";

const LIMIT = 25;

export function ConsultationHistoryList() {
  const { canViewPrescriptions, canViewInvoices, isDoctor, isAdmin } =
    usePermissions();
  const { data, isLoading, isError, refetch } = useAppointments({
    status: "completed",
    limit: LIMIT,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const canOpenConsultation = isDoctor || isAdmin;

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
            Completed consultations
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Open Rx & invoice records for review or printing.
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataState
          status={
            isLoading
              ? "loading"
              : isError
                ? "error"
                : items.length === 0
                  ? "empty"
                  : "success"
          }
          loadingMessage="Loading recent consultations…"
          errorMessage="We could not load the consultation list. Please try again."
          onRetry={() => refetch()}
          emptyTitle="No completed consultations yet"
          emptyDescription="Once you complete a consultation, it will appear here with quick access to prescription and invoice records."
          emptyIcon={ClipboardList}
          className="min-h-[200px]"
        >
          <ul className="divide-y divide-border/60">
            {items.map((apt) => {
              const start = new Date(apt.startTime);
              const dateLabel = formatLocaleDateShortMonthYear(start);
              const timeLabel = formatTime(start, "h:mm a");
              const patientName = apt.patient
                ? `${apt.patient.firstName} ${apt.patient.lastName}`.trim()
                : "Unknown patient";
              const doctorName = apt.doctor?.name ?? null;
              const prescriptionId = apt.prescription?.id ?? null;
              const invoiceId = apt.invoice?.id ?? null;

              return (
                <li
                  key={apt.id ?? `${apt.patientId}-${apt.startTime}`}
                  className="px-4 py-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {patientName}
                        </span>
                        <Badge
                          variant="secondary"
                          className="badge-muted text-[length:var(--fs-2xs)]"
                        >
                          {humanizeUiLabel(apt.status)}
                        </Badge>
                        {prescriptionId ? (
                          <Badge
                            variant="secondary"
                            className="badge-success gap-1 text-[length:var(--fs-2xs)]"
                          >
                            <Pill className="h-3 w-3" aria-hidden />
                            Rx
                          </Badge>
                        ) : null}
                        {invoiceId ? (
                          <Badge
                            variant="secondary"
                            className="badge-info gap-1 text-[length:var(--fs-2xs)]"
                          >
                            <Receipt className="h-3 w-3" aria-hidden />
                            Invoice
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {dateLabel} · {timeLabel}
                        {doctorName ? ` · Dr. ${doctorName}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end">
                      {canOpenConsultation && apt.id ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 rounded-full px-3 text-xs"
                        >
                          <Link href={`/consultation/${apt.id}?from=list`}>
                            <Eye className="h-3 w-3" aria-hidden />
                            View visit
                          </Link>
                        </Button>
                      ) : null}
                      {canViewPrescriptions && prescriptionId ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 rounded-full px-3 text-xs"
                        >
                          <Link href={`/prescriptions/${prescriptionId}`}>
                            <FileText className="h-3 w-3" aria-hidden />
                            Rx
                          </Link>
                        </Button>
                      ) : null}
                      {canViewInvoices && invoiceId ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 rounded-full px-3 text-xs"
                        >
                          <Link href={`/invoices/${invoiceId}`}>
                            <Receipt className="h-3 w-3" aria-hidden />
                            Invoice
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {data?.hasMore ? (
            <div className="border-t border-border/60 px-4 py-2 text-center text-xs text-muted-foreground">
              Showing the {LIMIT} most recent. Use Appointments &gt; Completed
              filter for the full archive.
            </div>
          ) : null}
        </DataState>
      </CardContent>
    </Card>
  );
}
