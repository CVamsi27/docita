"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
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
import { useAuth } from "@/lib/auth/auth-context";

const PAGE_SIZE = 25;

interface ConsultationHistoryDoctor {
  id: string;
  name: string;
}

interface ConsultationHistoryListProps {
  scopedDoctorId?: string;
  canViewAllDoctors?: boolean;
  selectedDoctorId?: string;
  onDoctorSelect?: (doctorId: string | undefined) => void;
  doctorsList?: ConsultationHistoryDoctor[];
}

export function ConsultationHistoryList({
  scopedDoctorId,
  canViewAllDoctors = false,
  selectedDoctorId,
  onDoctorSelect,
  doctorsList = [],
}: ConsultationHistoryListProps) {
  const { user } = useAuth();
  const { canViewPrescriptions, canViewInvoices, canStartConsultation } =
    usePermissions();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [scopedDoctorId]);

  const { data, isLoading, isError, refetch } = useAppointments({
    status: "completed",
    limit: PAGE_SIZE,
    page,
    sortOrder: "desc",
    ...(scopedDoctorId ? { doctorId: scopedDoctorId } : {}),
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const totalCount = data?.count ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = Boolean(data?.hasMore);

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/60 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
              Completed consultations
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Open Rx and invoice records for review or printing.
            </p>
          </div>
          {canViewAllDoctors && doctorsList.length > 0 && onDoctorSelect ? (
            <Select
              value={selectedDoctorId || "all"}
              onValueChange={(value) =>
                onDoctorSelect(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                className="h-9 w-full sm:w-[220px] text-sm"
                aria-label="Filter completed consultations by doctor"
              >
                <SelectValue placeholder="Doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {doctorsList.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    Dr. {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
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
              const canViewThisVisit =
                Boolean(apt.id) &&
                canStartConsultation &&
                apt.doctorId === user?.id;

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
                      {canViewThisVisit ? (
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
          {totalCount > 0 ? (
            <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                <span className="hidden sm:inline">Page {page} · </span>
                {totalCount} completed consultation
                {totalCount === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!canGoPrev || isLoading}
                >
                  Previous
                </Button>
                <span className="px-1 text-xs text-muted-foreground">{page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!canGoNext || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </DataState>
      </CardContent>
    </Card>
  );
}
