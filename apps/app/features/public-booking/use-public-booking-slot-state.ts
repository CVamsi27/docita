"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPickerIsoDate } from "@workspace/utils";
import {
  usePublicBookingClinic,
  usePublicBookingDoctors,
  usePublicBookingSlots,
} from "@workspace/data-access";
import { ANY_DOCTOR_ID } from "@/features/public-booking/public-booking-constants";
import { parseIsoDateToLocalDate } from "@/features/public-booking/public-booking-page-state-helpers";

export function usePublicBookingSlotState(referralCode: string) {
  const clinicQuery = usePublicBookingClinic(referralCode);
  const doctorsQuery = usePublicBookingDoctors(referralCode);

  const [doctorId, setDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState(() => formatPickerIsoDate(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const slotsQuery = usePublicBookingSlots(
    referralCode,
    doctorId === ANY_DOCTOR_ID ? "any" : doctorId,
    slotDate,
  );

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [selectedSlotDoctorId, setSelectedSlotDoctorId] = useState<string | null>(
    null,
  );
  const [timeRangeStart, setTimeRangeStart] = useState<string>("");
  const [timeRangeEnd, setTimeRangeEnd] = useState<string>("");

  const selectedCalendarDay = useMemo(
    () => parseIsoDateToLocalDate(slotDate),
    [slotDate],
  );

  useEffect(() => {
    const parsed = parseIsoDateToLocalDate(slotDate);
    if (parsed) setCalendarMonth(parsed);
  }, [slotDate]);

  useEffect(() => {
    setTimeRangeStart("");
    setTimeRangeEnd("");
  }, [slotDate, doctorId]);

  const handleSelectSlot = useCallback((startIso: string, endIso: string) => {
    setSelectedStart(startIso);
    setSelectedEnd(endIso);
    setSelectedSlotDoctorId(null);
  }, []);

  const handleSelectSlotWithDoctor = useCallback(
    (startIso: string, endIso: string, slotDoctorId: string) => {
      setSelectedStart(startIso);
      setSelectedEnd(endIso);
      setSelectedSlotDoctorId(slotDoctorId);
    },
    [],
  );

  const clearSlotSelection = useCallback(() => {
    setSelectedStart(null);
    setSelectedEnd(null);
    setSelectedSlotDoctorId(null);
  }, []);

  const selectedDoctor = useMemo(
    () => (doctorsQuery.data?.doctors ?? []).find((d) => d.id === doctorId),
    [doctorId, doctorsQuery.data?.doctors],
  );

  const selectedDoctorName =
    doctorId === ANY_DOCTOR_ID
      ? "Any available doctor"
      : (selectedDoctor?.name ?? null);

  const clinic = clinicQuery.data;
  const allSlots = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data?.slots]);
  const availableSlots = useMemo(
    () => allSlots.filter((s) => s.isAvailable),
    [allSlots],
  );

  const timeRangeOptions = useMemo(() => {
    const uniq = (values: string[]) =>
      Array.from(new Set(values)).filter(Boolean);
    const sortIso = (a: string, b: string) =>
      new Date(a).getTime() - new Date(b).getTime();
    return {
      starts: uniq(allSlots.map((s) => s.startTime)).sort(sortIso),
      ends: uniq(allSlots.map((s) => s.endTime)).sort(sortIso),
    };
  }, [allSlots]);

  const filteredAvailableSlots = useMemo(() => {
    if (!timeRangeStart && !timeRangeEnd) return availableSlots;
    const startMs = timeRangeStart ? new Date(timeRangeStart).getTime() : null;
    const endMs = timeRangeEnd ? new Date(timeRangeEnd).getTime() : null;
    return availableSlots.filter((s) => {
      const sStart = new Date(s.startTime).getTime();
      const sEnd = new Date(s.endTime).getTime();
      if (Number.isNaN(sStart) || Number.isNaN(sEnd)) return false;
      if (startMs !== null && sStart < startMs) return false;
      if (endMs !== null && sEnd > endMs) return false;
      return true;
    });
  }, [availableSlots, timeRangeEnd, timeRangeStart]);

  const pageState = useMemo(() => {
    if (clinicQuery.isLoading) return "loading" as const;
    if (clinicQuery.isError) return "error" as const;
    return "success" as const;
  }, [clinicQuery.isLoading, clinicQuery.isError]);

  return {
    clinicQuery,
    doctorsQuery,
    slotsQuery,
    doctorId,
    setDoctorId,
    slotDate,
    setSlotDate,
    calendarMonth,
    setCalendarMonth,
    selectedStart,
    selectedEnd,
    selectedSlotDoctorId,
    timeRangeStart,
    setTimeRangeStart,
    timeRangeEnd,
    setTimeRangeEnd,
    selectedCalendarDay,
    handleSelectSlot,
    handleSelectSlotWithDoctor,
    clearSlotSelection,
    selectedDoctorName,
    clinic,
    allSlots,
    availableSlots,
    filteredAvailableSlots,
    timeRangeOptions,
    pageState,
  };
}
