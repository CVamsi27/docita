"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, Check, X, SlidersHorizontal, AlertCircle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { Textarea } from "@workspace/ui/components/textarea";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { AppointmentRequestResponse } from "@workspace/types";
import {
  addMinutesToClinicWallDatetimeLocal,
  clinicDateAndTimeToWallDatetimeLocal,
  clinicWallDatetimeLocalToUtcIso,
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
  formatDistanceToNow,
  formatScheduleTime,
  utcInstantToClinicWallDatetimeLocal,
} from "@workspace/utils";
import {
  useAppointmentRequests,
  useApproveAppointmentRequest,
  useRejectAppointmentRequest,
} from "@/hooks/api/use-appointments";
import { useDoctorAvailabilitySlots, useDoctors } from "@/hooks/api/use-settings";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { fetchNextAvailableSlotWindow } from "@/lib/doctor-availability-first-slot";
import {
  formatClockTime,
  formatLocaleDateShortMonthYear,
} from "@/lib/formatters";
import {
  extractApproveAppointmentRequestFieldErrors,
  type ApproveScheduleFieldKey,
} from "@/lib/utils/appointment-request-approve-errors";
import { extractProblemDetail } from "@/lib/utils/api-validation-errors";
import { cn } from "@workspace/ui/lib/utils";
import { getSafeUserMessage } from "@/lib/user-facing-errors";
import { useClinic } from "@/lib/clinic-context";

const REJECT_REASON_CUSTOM = "CUSTOM";
const REJECT_REASON_OPTIONS: { value: string; label: string }[] = [
  {
    value: "Please call the front desk to confirm a time.",
    label: "Call the front desk to confirm",
  },
  {
    value:
      "No slots are available at the requested time. We can offer the next available slot.",
    label: "No slots at requested time",
  },
  {
    value:
      "Doctor is unavailable. We can offer another doctor or a different time.",
    label: "Doctor unavailable",
  },
  { value: REJECT_REASON_CUSTOM, label: "Custom message…" },
];

function utcRequestedSlotToWallLocal(
  requestedSlotStart: string | Date | null | undefined,
  timezone: string,
): string | null {
  if (!requestedSlotStart) return null;
  const d =
    typeof requestedSlotStart === "string"
      ? new Date(requestedSlotStart)
      : requestedSlotStart;
  if (Number.isNaN(d.getTime())) return null;
  const wall = utcInstantToClinicWallDatetimeLocal(d, timezone);
  return wall.length > 0 ? wall : null;
}

function preferredDateTimeWallLocal(
  preferredDate: string | Date,
  preferredTime: string | null | undefined,
  timezone: string,
): string {
  const dateStr =
    typeof preferredDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(preferredDate.trim())
      ? preferredDate.trim()
      : formatClinicPickerDayIsoFromSelection(new Date(preferredDate), timezone);
  const hhmm =
    preferredTime && /^\d{2}:\d{2}$/.test(preferredTime.trim())
      ? preferredTime.trim()
      : "09:00";
  return clinicDateAndTimeToWallDatetimeLocal(dateStr, hhmm, timezone);
}

function patientName(request: AppointmentRequestResponse) {
  const firstName = request.patient?.firstName ?? "";
  const lastName = request.patient?.lastName ?? "";
  return `${firstName} ${lastName}`.trim() || "Patient";
}

function patientPhone(request: AppointmentRequestResponse): string | null {
  const raw = request.patient?.phoneNumber;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function pickerIsoToLocalNoonDate(pickerIso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pickerIso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return null;
  }
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

function parsePickerIsoToLocalDate(pickerIso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pickerIso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return null;
  }
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function schedulingSummaryLines(request: AppointmentRequestResponse): {
  primary: string;
} {
  const slotStart = request.requestedSlotStart
    ? new Date(request.requestedSlotStart)
    : null;
  const slotEnd = request.requestedSlotEnd
    ? new Date(request.requestedSlotEnd)
    : null;
  const hasSlot =
    slotStart &&
    slotEnd &&
    !Number.isNaN(slotStart.getTime()) &&
    !Number.isNaN(slotEnd.getTime());

  if (hasSlot) {
    const dayLabel = formatLocaleDateShortMonthYear(slotStart);
    const range = `${formatClockTime(slotStart)} – ${formatClockTime(slotEnd)}`;
    return {
      primary: `Requested slot · ${dayLabel} · ${range}`,
    };
  }

  const pref = new Date(request.preferredDate);
  const prefOk = !Number.isNaN(pref.getTime());
  let primary = prefOk
    ? `Preferred date · ${formatLocaleDateShortMonthYear(pref)}`
    : "Preferred date not set";
  if (request.preferredTime && /^\d{2}:\d{2}$/.test(request.preferredTime)) {
    primary += ` at ${formatScheduleTime(request.preferredTime)}`;
  }
  return { primary };
}

type SchedulableDoctor = { id: string; name: string | null; role: string };

interface AppointmentRequestRowProps {
  request: AppointmentRequestResponse;
  doctorOptions: SchedulableDoctor[];
  doctorByRequest: Record<string, string>;
  setDoctorByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  startByRequest: Record<string, string>;
  setStartByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  rejectReasonByRequest: Record<string, string>;
  setRejectReasonByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  rejectCustomByRequest: Record<string, string>;
  setRejectCustomByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  onApprove: (request: AppointmentRequestResponse) => void | Promise<void>;
  onReject: (request: AppointmentRequestResponse) => void | Promise<void>;
  isMutating: boolean;
  approveFieldErrors?: Partial<Record<ApproveScheduleFieldKey, string>>;
  onClearApproveFieldErrors: () => void;
  clinicTimezone: string;
  slotSuggestionGeneration: number;
}

function AppointmentRequestRow({
  request,
  doctorOptions,
  doctorByRequest,
  setDoctorByRequest,
  startByRequest,
  setStartByRequest,
  rejectReasonByRequest,
  setRejectReasonByRequest,
  rejectCustomByRequest,
  setRejectCustomByRequest,
  onApprove,
  onReject,
  isMutating,
  approveFieldErrors,
  onClearApproveFieldErrors,
  clinicTimezone,
  slotSuggestionGeneration,
}: AppointmentRequestRowProps) {
  const effectiveDoctorId =
    doctorByRequest[request.id] ??
    request.preferredDoctorId ??
    doctorOptions[0]?.id ??
    "";

  const hasStructuredSlot = Boolean(
    request.requestedSlotStart &&
      request.requestedSlotEnd &&
      utcRequestedSlotToWallLocal(
        request.requestedSlotStart,
        clinicTimezone,
      ) &&
      utcRequestedSlotToWallLocal(request.requestedSlotEnd, clinicTimezone),
  );

  useEffect(() => {
    if (!effectiveDoctorId || hasStructuredSlot) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const win = await fetchNextAvailableSlotWindow(
        request.preferredDate,
        effectiveDoctorId,
        clinicTimezone,
      );
      if (cancelled || !win) {
        return;
      }
      setStartByRequest((prev) => ({
        ...prev,
        [request.id]: win.startLocal,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [
    request.id,
    request.preferredDate,
    effectiveDoctorId,
    hasStructuredSlot,
    request.requestedSlotStart,
    request.requestedSlotEnd,
    setStartByRequest,
    clinicTimezone,
    slotSuggestionGeneration,
  ]);

  const structuredStart = utcRequestedSlotToWallLocal(
    request.requestedSlotStart,
    clinicTimezone,
  );
  const structuredEnd = utcRequestedSlotToWallLocal(
    request.requestedSlotEnd,
    clinicTimezone,
  );
  const fallbackStart = preferredDateTimeWallLocal(
    request.preferredDate,
    request.preferredTime,
    clinicTimezone,
  );

  const startValue =
    startByRequest[request.id] ?? structuredStart ?? fallbackStart;
  const endValue = addMinutesToClinicWallDatetimeLocal(
    startValue,
    30,
    clinicTimezone,
  );
  const endDisplay = endValue ?? structuredEnd ?? startValue;

  const startDayIso = startValue.slice(0, 10);
  const startTimeHHmm = startValue.slice(11, 16);
  const startDaySelection = pickerIsoToLocalNoonDate(startDayIso);
  const { data: availabilitySlots = [] } = useDoctorAvailabilitySlots(
    startDaySelection ?? undefined,
    effectiveDoctorId || undefined,
    { enabled: Boolean(startDaySelection && effectiveDoctorId) },
  );
  const availableStartTimes = useMemo(() => {
    return availabilitySlots
      .filter(
        (s) =>
          s.isAvailable === true &&
          s.doctorId === effectiveDoctorId &&
          typeof s.time === "string" &&
          typeof s.endTime === "string",
      )
      .map((s) => ({ time: s.time, endTime: s.endTime }));
  }, [availabilitySlots, effectiveDoctorId]);

  const nowWallLocal = utcInstantToClinicWallDatetimeLocal(
    new Date(),
    clinicTimezone,
  );
  const isPast = Boolean(nowWallLocal && startValue < nowWallLocal);
  const endHHmm = endDisplay.slice(11, 16);
  const matchesAvailableSlot = availableStartTimes.some(
    (s) => s.time === startTimeHHmm && s.endTime === endHHmm,
  );
  const isStartAllowed =
    !isPast && (availableStartTimes.length === 0 || matchesAvailableSlot);

  const summary = schedulingSummaryLines(request);
  const phone = patientPhone(request);
  const preferredDoctorLabel =
    request.preferredDoctor?.name?.trim() || null;
  const arrivalRelative = formatDistanceToNow(request.createdAt);

  const hasApproveFieldErrors = Boolean(
    approveFieldErrors &&
      (approveFieldErrors.doctorId ||
        approveFieldErrors.startTime ||
        approveFieldErrors.endTime),
  );
  const approveBlocked = isMutating || !isStartAllowed || hasApproveFieldErrors;

  const approveError =
    approveFieldErrors?.doctorId ??
    approveFieldErrors?.startTime ??
    approveFieldErrors?.endTime ??
    (isPast ? "Start time is in the past." : null) ??
    (!isStartAllowed ? "Not available for this doctor." : null);

  const slotLabel = `${formatScheduleTime(startTimeHHmm)}–${formatScheduleTime(endHHmm)}`;
  const slotDayLabel = (() => {
    const d = parsePickerIsoToLocalDate(startDayIso);
    return d ? formatLocaleDateShortMonthYear(d) : startDayIso;
  })();
  const selectedDoctorName =
    doctorOptions.find((doc) => doc.id === effectiveDoctorId)?.name ??
    preferredDoctorLabel ??
    null;

  const rejectReason = rejectReasonByRequest[request.id] ?? "";
  const rejectCustom = rejectCustomByRequest[request.id] ?? "";
  const canSubmitReject =
    rejectReason.length > 0 &&
    (rejectReason !== REJECT_REASON_CUSTOM || rejectCustom.trim().length > 0);

  return (
    <div className="group/req rounded-md border border-border/60 bg-card transition-colors hover:bg-muted/20">
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Patient + context — two tight lines */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="truncate text-[length:var(--fs-sm)] font-semibold leading-tight text-foreground">
              {patientName(request)}
            </span>
            {phone ? (
              <span className="text-[length:var(--fs-xs)] tabular-nums text-muted-foreground">
                {phone}
              </span>
            ) : null}
            {arrivalRelative ? (
              <span className="text-[length:var(--fs-2xs)] text-muted-foreground/70">
                {arrivalRelative}
              </span>
            ) : null}
          </div>
          <p className="line-clamp-1 text-[length:var(--fs-xs)] text-muted-foreground">
            <span className="text-foreground/80">
              {request.reason?.trim() ? request.reason : "No reason"}
            </span>
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            {summary.primary}
            {preferredDoctorLabel ? (
              <>
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                {`Dr. ${preferredDoctorLabel}`}
              </>
            ) : null}
            {request.notes ? (
              <>
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                {request.notes}
              </>
            ) : null}
          </p>
          {approveError ? (
            <p
              role="alert"
              className="mt-0.5 flex items-center gap-1 text-[length:var(--fs-2xs)] text-destructive"
            >
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{approveError}</span>
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Adjust popover (doctor / date / time) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Adjust slot"
                className={cn(
                  "h-8 gap-1.5 px-2 text-[length:var(--fs-xs)] font-normal text-muted-foreground hover:text-foreground",
                  (hasApproveFieldErrors || !isStartAllowed) &&
                    "text-destructive hover:text-destructive",
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden tabular-nums sm:inline">
                  {slotLabel}
                </span>
                {!isStartAllowed || hasApproveFieldErrors ? (
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 space-y-2.5 p-3"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <div className="space-y-1">
                <label
                  htmlFor={`apr-doctor-${request.id}`}
                  className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Doctor
                </label>
                <Select
                  value={effectiveDoctorId}
                  onValueChange={(value) => {
                    onClearApproveFieldErrors();
                    setDoctorByRequest((prev) => ({
                      ...prev,
                      [request.id]: value,
                    }));
                    setStartByRequest((prev) => {
                      const next = { ...prev };
                      delete next[request.id];
                      return next;
                    });
                  }}
                >
                  <SelectTrigger
                    id={`apr-doctor-${request.id}`}
                    size="sm"
                    className={cn(
                      "h-8 w-full text-[length:var(--fs-xs)]",
                      approveFieldErrors?.doctorId && "border-destructive",
                    )}
                    aria-invalid={
                      approveFieldErrors?.doctorId ? true : undefined
                    }
                  >
                    <SelectValue placeholder="Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorOptions.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name ?? "Doctor"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-start px-2 text-[length:var(--fs-xs)] font-normal"
                      >
                        {slotDayLabel}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          parsePickerIsoToLocalDate(startDayIso) ?? undefined
                        }
                        onSelect={(d) => {
                          if (!d) return;
                          onClearApproveFieldErrors();
                          const nextIso =
                            formatClinicPickerDayIsoFromSelection(
                              d,
                              clinicTimezone,
                            );
                          setStartByRequest((prev) => ({
                            ...prev,
                            [request.id]: `${nextIso}T${startTimeHHmm}`,
                          }));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={`apr-start-${request.id}`}
                    className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Time
                  </label>
                  <Select
                    value={startTimeHHmm}
                    onValueChange={(value) => {
                      onClearApproveFieldErrors();
                      setStartByRequest((prev) => ({
                        ...prev,
                        [request.id]: `${startDayIso}T${value}`,
                      }));
                    }}
                  >
                    <SelectTrigger
                      id={`apr-start-${request.id}`}
                      size="sm"
                      className={cn(
                        "h-8 w-full text-[length:var(--fs-xs)]",
                        (approveFieldErrors?.startTime || !isStartAllowed) &&
                          "border-destructive",
                      )}
                      aria-invalid={
                        approveFieldErrors?.startTime || !isStartAllowed
                          ? true
                          : undefined
                      }
                    >
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStartTimes.length > 0 ? (
                        availableStartTimes.map((s) => (
                          <SelectItem key={s.time} value={s.time}>
                            {formatScheduleTime(s.time)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={startTimeHHmm}>
                          {formatScheduleTime(startTimeHHmm)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-[length:var(--fs-2xs)] text-muted-foreground">
                Ends {formatScheduleTime(endHHmm)}
                {selectedDoctorName ? ` · Dr. ${selectedDoctorName}` : ""}
              </p>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            className="h-8 gap-1 px-3 text-[length:var(--fs-xs)]"
            disabled={approveBlocked}
            onClick={() => void onApprove(request)}
            aria-label={`Approve at ${slotLabel}`}
          >
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Approve
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Reject"
                className="h-8 gap-1 px-2 text-[length:var(--fs-xs)] text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Reject</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 space-y-2.5 p-3"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <div className="space-y-1">
                <label
                  htmlFor={`apr-reject-reason-${request.id}`}
                  className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Reason
                </label>
                <Select
                  value={rejectReason}
                  onValueChange={(value) =>
                    setRejectReasonByRequest((prev) => ({
                      ...prev,
                      [request.id]: value,
                    }))
                  }
                >
                  <SelectTrigger
                    id={`apr-reject-reason-${request.id}`}
                    size="sm"
                    className="h-8 w-full text-[length:var(--fs-xs)]"
                  >
                    <SelectValue placeholder="Choose a reason…" />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECT_REASON_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rejectReason === REJECT_REASON_CUSTOM ? (
                <div className="space-y-1">
                  <label
                    htmlFor={`apr-reject-${request.id}`}
                    className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Message for patient
                  </label>
                  <Textarea
                    id={`apr-reject-${request.id}`}
                    value={rejectCustom}
                    onChange={(event) =>
                      setRejectCustomByRequest((prev) => ({
                        ...prev,
                        [request.id]: event.target.value,
                      }))
                    }
                    placeholder="Write a short message…"
                    rows={3}
                    className="min-h-[60px] resize-y text-[length:var(--fs-xs)]"
                  />
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1 px-3 text-[length:var(--fs-xs)]"
                  disabled={isMutating || !canSubmitReject}
                  onClick={() => void onReject(request)}
                >
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Reject request
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

export function AppointmentRequestsPanel() {
  const { clinic } = useClinic();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const { data, isLoading, isError, refetch } = useAppointmentRequests({
    status: "PENDING",
    limit: 50,
  });
  const { data: doctors = [] } = useDoctors();
  const approveRequest = useApproveAppointmentRequest();
  const rejectRequest = useRejectAppointmentRequest();
  const [doctorByRequest, setDoctorByRequest] = useState<Record<string, string>>(
    {},
  );
  const [startByRequest, setStartByRequest] = useState<Record<string, string>>(
    {},
  );
  const [rejectReasonByRequest, setRejectReasonByRequest] = useState<
    Record<string, string>
  >({});
  const [rejectCustomByRequest, setRejectCustomByRequest] = useState<
    Record<string, string>
  >({});
  const [approveFieldErrorsByRequest, setApproveFieldErrorsByRequest] =
    useState<
      Record<string, Partial<Record<ApproveScheduleFieldKey, string>>>
    >({});
  const [slotSuggestionGeneration, setSlotSuggestionGeneration] = useState(0);
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(
    () => new Set(),
  );

  const doctorOptions = useMemo(
    () =>
      doctors.filter((doctor) =>
        ["DOCTOR", "ADMIN_DOCTOR"].includes(String(doctor.role)),
      ),
    [doctors],
  );

  const sortedRequests = useMemo(() => {
    const items = data?.items ?? [];
    return [...items]
      .filter((r) => !hiddenRequestIds.has(r.id))
      .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [data?.items, hiddenRequestIds]);

  const requests = sortedRequests;
  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : requests.length === 0
        ? "empty"
        : "success";
  const isMutating = approveRequest.isPending || rejectRequest.isPending;

  const handleApprove = async (request: AppointmentRequestResponse) => {
    setApproveFieldErrorsByRequest((prev) => {
      const next = { ...prev };
      delete next[request.id];
      return next;
    });

    const doctorId =
      doctorByRequest[request.id] ??
      request.preferredDoctorId ??
      doctorOptions[0]?.id;
    if (!doctorId) {
      setApproveFieldErrorsByRequest((prev) => ({
        ...prev,
        [request.id]: {
          doctorId: "Select a doctor before approving this request.",
        },
      }));
      return;
    }

    const structuredStart = utcRequestedSlotToWallLocal(
      request.requestedSlotStart,
      clinicTz,
    );
    const structuredEnd = utcRequestedSlotToWallLocal(
      request.requestedSlotEnd,
      clinicTz,
    );

    let startLocal =
      startByRequest[request.id] ?? structuredStart ?? null;
    let endLocal = structuredEnd ?? null;

    if (!startLocal || !endLocal) {
      const fromSchedule = await fetchNextAvailableSlotWindow(
        request.preferredDate,
        doctorId,
        clinicTz,
      );
      if (fromSchedule) {
        startLocal = startLocal ?? fromSchedule.startLocal;
        endLocal = endLocal ?? fromSchedule.endLocal;
      }
    }

    startLocal =
      startLocal ??
      preferredDateTimeWallLocal(
        request.preferredDate,
        request.preferredTime,
        clinicTz,
      );
    endLocal =
      endLocal ??
      addMinutesToClinicWallDatetimeLocal(startLocal, 30, clinicTz) ??
      startLocal;

    const startUtc = clinicWallDatetimeLocalToUtcIso(startLocal, clinicTz);
    const endUtc = clinicWallDatetimeLocalToUtcIso(endLocal, clinicTz);

    if (!startUtc || !endUtc) {
      showUserFacingErrorToast(
        null,
        "Enter valid start and end times before approving.",
        "generic",
      );
      return;
    }

    try {
      await approveRequest.mutateAsync({
        id: request.id,
        doctorId,
        startTime: startUtc,
        endTime: endUtc,
        type: "Consultation",
        notes: request.notes ?? request.reason,
      });
      setHiddenRequestIds((prev) => {
        const next = new Set(prev);
        next.add(request.id);
        return next;
      });
      setSlotSuggestionGeneration((g) => g + 1);
      setStartByRequest({});
      setRejectReasonByRequest({});
      setRejectCustomByRequest({});
      void refetch();
    } catch (error) {
      const fieldErrors = extractApproveAppointmentRequestFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setApproveFieldErrorsByRequest((prev) => ({
          ...prev,
          [request.id]: fieldErrors,
        }));
        return;
      }

      const detail = extractProblemDetail(error);
      showUserFacingErrorToast(
        null,
        getSafeUserMessage(
          detail,
          "We could not approve this appointment request. Please try again.",
        ),
        "generic",
      );
    }
  };

  const handleReject = async (request: AppointmentRequestResponse) => {
    const reason = rejectReasonByRequest[request.id]?.trim();
    const responseMessage =
      reason === REJECT_REASON_CUSTOM
        ? (rejectCustomByRequest[request.id] ?? "").trim()
        : reason;
    if (!responseMessage) {
      showUserFacingErrorToast(
        null,
        "Enter a response before rejecting this request.",
        "generic",
      );
      return;
    }

    try {
      await rejectRequest.mutateAsync({
        id: request.id,
        responseMessage,
      });
      setHiddenRequestIds((prev) => {
        const next = new Set(prev);
        next.add(request.id);
        return next;
      });
      setSlotSuggestionGeneration((g) => g + 1);
      setStartByRequest({});
      setRejectReasonByRequest({});
      setRejectCustomByRequest({});
      void refetch();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not reject this appointment request. Please try again.",
        "generic",
      );
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[length:var(--fs-sm)] font-semibold">
            Appointment requests
          </CardTitle>
          {(data?.count ?? 0) > 0 ? (
            <Badge variant="secondary" className="h-5 px-2 text-[length:var(--fs-2xs)]">
              {data?.count} pending
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <DataState
          status={state}
          loadingMessage="Loading appointment requests…"
          errorMessage="We could not load appointment requests."
          onRetry={() => void refetch()}
          emptyIcon={Inbox}
          emptyTitle="No pending requests"
          emptyDescription="Patient portal appointment requests will appear here"
        >
          <div className="space-y-2">
            {requests.map((request) => (
              <AppointmentRequestRow
                key={request.id}
                request={request}
                doctorOptions={doctorOptions}
                doctorByRequest={doctorByRequest}
                setDoctorByRequest={setDoctorByRequest}
                startByRequest={startByRequest}
                setStartByRequest={setStartByRequest}
                rejectReasonByRequest={rejectReasonByRequest}
                setRejectReasonByRequest={setRejectReasonByRequest}
                rejectCustomByRequest={rejectCustomByRequest}
                setRejectCustomByRequest={setRejectCustomByRequest}
                onApprove={handleApprove}
                onReject={handleReject}
                isMutating={isMutating}
                approveFieldErrors={approveFieldErrorsByRequest[request.id]}
                onClearApproveFieldErrors={() =>
                  setApproveFieldErrorsByRequest((prev) => {
                    if (!(request.id in prev)) return prev;
                    const next = { ...prev };
                    delete next[request.id];
                    return next;
                  })
                }
                clinicTimezone={clinicTz}
                slotSuggestionGeneration={slotSuggestionGeneration}
              />
            ))}
          </div>
        </DataState>
      </CardContent>
    </Card>
  );
}
