"use client";

import { useEffect, useMemo } from "react";
import { useDoctorAvailabilitySlots } from "@workspace/data-access";
import {
  addMinutesToClinicWallDatetimeLocal,
  formatScheduleTime,
  utcInstantToClinicWallDatetimeLocal,
  formatDistanceToNow,
} from "@workspace/utils";
import { fetchNextAvailableSlotWindow } from "@/lib/utils/doctor-availability-first-slot";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";
import type { ApproveScheduleFieldKey } from "@/lib/utils/appointment-request-approve-errors";
import type { AppointmentRequestResponse } from "@workspace/types";
import {
  REJECT_REASON_CUSTOM,
  type SchedulableDoctor,
  patientPhone,
  pickerIsoToLocalNoonDate,
  parsePickerIsoToLocalDate,
  preferredDateTimeWallLocal,
  schedulingSummaryLines,
  utcRequestedSlotToWallLocal,
} from "./request-row-helpers";

function buildApproveGating(params: {
  isMutating: boolean;
  isPast: boolean;
  isStartAllowed: boolean;
  approveFieldErrors?: Partial<Record<ApproveScheduleFieldKey, string>>;
}) {
  const { isMutating, isPast, isStartAllowed, approveFieldErrors } = params;
  const hasApproveFieldErrors = Boolean(
    approveFieldErrors && (approveFieldErrors.doctorId || approveFieldErrors.startTime || approveFieldErrors.endTime),
  );
  const approveBlocked = isMutating || !isStartAllowed || hasApproveFieldErrors;
  const approveError =
    approveFieldErrors?.doctorId ?? approveFieldErrors?.startTime ?? approveFieldErrors?.endTime ??
    (isPast ? "Start time is in the past." : null) ??
    (!isStartAllowed ? "Not available for this doctor." : null);
  return { hasApproveFieldErrors, approveBlocked, approveError };
}

function buildSlotDisplayLabels(startDayIso: string, startTimeHHmm: string, endHHmm: string) {
  const slotLabel = `${formatScheduleTime(startTimeHHmm)}–${formatScheduleTime(endHHmm)}`;
  const slotDayLabel = (() => {
    const d = parsePickerIsoToLocalDate(startDayIso);
    return d ? formatLocaleDateShortMonthYear(d) : startDayIso;
  })();
  return { slotLabel, slotDayLabel };
}

export interface UseAppointmentRequestRowInput {
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

export function useAppointmentRequestRow(input: UseAppointmentRequestRowInput) {
  const {
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
  } = input;

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
    if (!effectiveDoctorId || hasStructuredSlot) return;

    let cancelled = false;
    void (async () => {
      const win = await fetchNextAvailableSlotWindow(
        request.preferredDate,
        effectiveDoctorId,
        clinicTimezone,
      );
      if (cancelled || !win) return;
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
  const availableStartTimes = useMemo(
    () =>
      availabilitySlots
        .filter(
          (s) =>
            s.isAvailable === true &&
            s.doctorId === effectiveDoctorId &&
            typeof s.time === "string" &&
            typeof s.endTime === "string",
        )
        .map((s) => ({ time: s.time, endTime: s.endTime })),
    [availabilitySlots, effectiveDoctorId],
  );

  const nowWallLocal = utcInstantToClinicWallDatetimeLocal(
    new Date(),
    clinicTimezone,
  );
  const isPast = Boolean(nowWallLocal && startValue < nowWallLocal);
  const endHHmm = endDisplay?.slice(11, 16) ?? "";
  const matchesAvailableSlot = availableStartTimes.some(
    (s) => s.time === startTimeHHmm && s.endTime === endHHmm,
  );
  const isStartAllowed =
    !isPast && (availableStartTimes.length === 0 || matchesAvailableSlot);

  const summary = schedulingSummaryLines(request);
  const phone = patientPhone(request);
  const preferredDoctorLabel = request.preferredDoctor?.name?.trim() || null;
  const arrivalRelative = formatDistanceToNow(request.createdAt);

  const { hasApproveFieldErrors, approveBlocked, approveError } = buildApproveGating({ isMutating, isPast, isStartAllowed, approveFieldErrors });
  const { slotLabel, slotDayLabel } = buildSlotDisplayLabels(startDayIso, startTimeHHmm, endHHmm);

  const selectedDoctorName =
    doctorOptions.find((doc) => doc.id === effectiveDoctorId)?.name ??
    preferredDoctorLabel ??
    null;

  const rejectReason = rejectReasonByRequest[request.id] ?? "";
  const rejectCustom = rejectCustomByRequest[request.id] ?? "";
  const canSubmitReject =
    rejectReason.length > 0 &&
    (rejectReason !== REJECT_REASON_CUSTOM ||
      rejectCustom.trim().length > 0);

  return {
    effectiveDoctorId,
    startValue,
    endDisplay,
    startDayIso,
    startTimeHHmm,
    endHHmm,
    availableStartTimes,
    isPast,
    isStartAllowed,
    matchesAvailableSlot,
    summary,
    phone,
    preferredDoctorLabel,
    arrivalRelative,
    hasApproveFieldErrors,
    approveBlocked,
    approveError,
    slotLabel,
    slotDayLabel,
    selectedDoctorName,
    rejectReason,
    rejectCustom,
    canSubmitReject,
    onApprove,
    onReject,
    isMutating,
    approveFieldErrors,
    onClearApproveFieldErrors,
    clinicTimezone,
    setDoctorByRequest,
    setStartByRequest,
    setRejectReasonByRequest,
    setRejectCustomByRequest,
    doctorOptions,
    request,
  };
}
