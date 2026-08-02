import { useEffect, useMemo } from "react";
import { useDoctorAvailabilitySlots } from "@workspace/data-access";
import {
  addMinutesToClinicWallDatetimeLocal,
  formatScheduleTime,
  utcInstantToClinicWallDatetimeLocal,
} from "@workspace/utils";
import { fetchNextAvailableSlotWindow } from "@/lib/utils/doctor-availability-first-slot";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";
import type { AppointmentRequestResponse } from "@workspace/types";
import {
  type SchedulableDoctor,
  parsePickerIsoToLocalDate,
  pickerIsoToLocalNoonDate,
  preferredDateTimeWallLocal,
  utcRequestedSlotToWallLocal,
} from "./request-row-helpers";

function buildSlotDisplayLabels(
  startDayIso: string,
  startTimeHHmm: string,
  endHHmm: string,
) {
  const slotLabel = `${formatScheduleTime(startTimeHHmm)}–${formatScheduleTime(endHHmm)}`;
  const slotDayLabel = (() => {
    const d = parsePickerIsoToLocalDate(startDayIso);
    return d ? formatLocaleDateShortMonthYear(d) : startDayIso;
  })();
  return { slotLabel, slotDayLabel };
}

/**
 * Derives the schedulable slot for a single appointment request: resolves the
 * effective doctor, fetches a suggested start time when the request has no
 * structured slot, computes the wall-clock start/end window, checks it
 * against the doctor's live availability, and prepares the display labels the
 * row needs (slot text, day label, selected-doctor name, past/allowed flags).
 */
export function useAppointmentRequestScheduling(params: {
  request: AppointmentRequestResponse;
  doctorOptions: SchedulableDoctor[];
  doctorByRequest: Record<string, string>;
  startByRequest: Record<string, string>;
  setStartByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  clinicTimezone: string;
  slotSuggestionGeneration: number;
}) {
  const {
    request,
    doctorOptions,
    doctorByRequest,
    startByRequest,
    setStartByRequest,
    clinicTimezone,
    slotSuggestionGeneration,
  } = params;

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

  const startValue = startByRequest[request.id] ?? structuredStart ?? fallbackStart;
  const endValue = addMinutesToClinicWallDatetimeLocal(
    startValue,
    30,
    clinicTimezone,
  );
  const endDisplay = endValue ?? structuredEnd ?? startValue;

  const startDayIso = startValue.slice(0, 10);
  const startTimeHHmm = startValue.slice(11, 16);
  const endHHmm = endDisplay?.slice(11, 16) ?? "";
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
  const matchesAvailableSlot = availableStartTimes.some(
    (s) => s.time === startTimeHHmm && s.endTime === endHHmm,
  );
  const isStartAllowed =
    !isPast && (availableStartTimes.length === 0 || matchesAvailableSlot);

  const { slotLabel, slotDayLabel } = buildSlotDisplayLabels(
    startDayIso,
    startTimeHHmm,
    endHHmm,
  );
  const selectedDoctorName =
    doctorOptions.find((doc) => doc.id === effectiveDoctorId)?.name ??
    (request.preferredDoctor?.name?.trim() || null);

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
    slotLabel,
    slotDayLabel,
    selectedDoctorName,
  };
}
