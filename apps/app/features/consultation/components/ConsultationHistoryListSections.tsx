import Link from "next/link";
import {
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
import { ClipboardList, Eye, FileText, Pill, Receipt } from "lucide-react";
import { getPatientFullName } from "@workspace/utils";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatLocaleDateShortMonthYear, formatTime } from "@/lib/formatters";

export interface ConsultationListDoctor {
  id: string;
  name: string;
}

export function ConsultationListHeader({
  doctorsList,
  canViewAllDoctors,
  selectedDoctorId,
  onDoctorSelect,
}: {
  doctorsList: ConsultationListDoctor[];
  canViewAllDoctors: boolean;
  selectedDoctorId?: string;
  onDoctorSelect?: (doctorId: string | undefined) => void;
}) {
  return (
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
  );
}

export function ConsultationListItem({
  appointment,
  canViewPrescriptions,
  canViewInvoices,
  canStartConsultation,
  userId,
}: {
  appointment: {
    id?: string;
    patientId?: string;
    startTime: string;
    status: string;
    patient?: {
      firstName?: string;
      lastName?: string;
      [key: string]: unknown;
    } | null;
    doctor?: { id?: string; name?: string } | null;
    doctorId?: string;
    prescription?: { id?: string } | null;
    invoice?: { id?: string } | null;
  };
  canViewPrescriptions: boolean;
  canViewInvoices: boolean;
  canStartConsultation: boolean;
  userId?: string;
}) {
  const start = new Date(appointment.startTime);
  const dateLabel = formatLocaleDateShortMonthYear(start);
  const timeLabel = formatTime(start, "h:mm a");
  const patientName = appointment.patient
    ? getPatientFullName(appointment.patient).trim()
    : "Unknown patient";
  const doctorName = appointment.doctor?.name ?? null;
  const prescriptionId = appointment.prescription?.id ?? null;
  const invoiceId = appointment.invoice?.id ?? null;
  const canViewThisVisit =
    Boolean(appointment.id) &&
    canStartConsultation &&
    appointment.doctorId === userId;

  return (
    <li
      key={appointment.id ?? `${appointment.patientId}-${appointment.startTime}`}
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
              {humanizeUiLabel(appointment.status)}
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
              <Link href={`/consultation/${appointment.id}?from=list`}>
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
}

export function ConsultationListPagination({
  page,
  totalCount,
  canGoPrev,
  canGoNext,
  isLoading,
  onPrevPage,
  onNextPage,
}: {
  page: number;
  totalCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  isLoading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  return (
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
          onClick={onPrevPage}
          disabled={!canGoPrev || isLoading}
        >
          Previous
        </Button>
        <span className="px-1 text-xs text-muted-foreground">{page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
