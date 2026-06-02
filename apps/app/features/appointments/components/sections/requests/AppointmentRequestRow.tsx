"use client";

import { useEffect, useMemo } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import type { AppointmentRequestResponse } from "@workspace/types";
import {
  addMinutesToClinicWallDatetimeLocal,
  formatScheduleTime,
  utcInstantToClinicWallDatetimeLocal,
  formatDistanceToNow,
} from "@workspace/utils";
import { useDoctorAvailabilitySlots } from "@workspace/data-access";
import { fetchNextAvailableSlotWindow } from "@/lib/utils/doctor-availability-first-slot";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";
import type { ApproveScheduleFieldKey } from "@/lib/utils/appointment-request-approve-errors";
import {
  REJECT_REASON_CUSTOM,
  type SchedulableDoctor,
  patientName,
  patientPhone,
  pickerIsoToLocalNoonDate,
  parsePickerIsoToLocalDate,
  preferredDateTimeWallLocal,
  schedulingSummaryLines,
  utcRequestedSlotToWallLocal,
} from "./request-row-helpers";
import { RequestAdjustPopover } from "./RequestAdjustPopover";
import { RequestRejectPopover } from "./RequestRejectPopover";

export type { SchedulableDoctor };

export interface AppointmentRequestRowProps {
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

export function AppointmentRequestRow({
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
    utcRequestedSlotToWallLocal(request.requestedSlotStart, clinicTimezone) &&
    utcRequestedSlotToWallLocal(request.requestedSlotEnd, clinicTimezone),
  );

  useEffect(() => {
    if (!effectiveDoctorId || hasStructuredSlot) return;

    let cancelled = false;
    void (async () => {
      const win = await fetchNextAvailableSlotWindow(
        request.preferredDate,
        effectiveDoctorId,
        clinicTimezone,
      );
      if (cancelled || !win) return;
      setStartByRequest((prev) => ({ ...prev, [request.id]: win.startLocal }));
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
  const preferredDoctorLabel = request.preferredDoctor?.name?.trim() || null;
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
        {/* Patient + context */}
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
          <RequestAdjustPopover
            requestId={request.id}
            doctorOptions={doctorOptions}
            effectiveDoctorId={effectiveDoctorId}
            selectedDoctorName={selectedDoctorName}
            slotLabel={slotLabel}
            slotDayLabel={slotDayLabel}
            startDayIso={startDayIso}
            startTimeHHmm={startTimeHHmm}
            endHHmm={endHHmm}
            availableStartTimes={availableStartTimes}
            isStartAllowed={isStartAllowed}
            hasApproveFieldErrors={hasApproveFieldErrors}
            approveFieldErrors={approveFieldErrors}
            clinicTimezone={clinicTimezone}
            onClearApproveFieldErrors={onClearApproveFieldErrors}
            setDoctorByRequest={setDoctorByRequest}
            setStartByRequest={setStartByRequest}
          />

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

          <RequestRejectPopover
            request={request}
            rejectReason={rejectReason}
            rejectCustom={rejectCustom}
            isMutating={isMutating}
            canSubmitReject={canSubmitReject}
            setRejectReasonByRequest={setRejectReasonByRequest}
            setRejectCustomByRequest={setRejectCustomByRequest}
            onReject={onReject}
          />
        </div>
      </div>
    </div>
  );
}
