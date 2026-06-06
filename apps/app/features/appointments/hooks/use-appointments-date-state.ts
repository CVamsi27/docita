import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
  pickerIsoToLocalDate,
  startOfMonth,
} from "@workspace/utils";

function initialPickerIso(): string {
  return formatClinicTodayPickerIso(DEFAULT_TIMEZONE);
}

function initialCalendarMonth(): Date {
  return startOfMonth(pickerIsoToLocalDate(initialPickerIso()));
}

export function useAppointmentsDateState(clinicTimezone: string | undefined) {
  const [selectedPickerIso, setSelectedPickerIso] = useState(initialPickerIso);
  const [calendarMonth, setCalendarMonth] =
    useState<Date>(initialCalendarMonth);
  const syncedClinicTzRef = useRef<string | null>(null);
  const userPickedDateRef = useRef(false);
  const clinicTz = useMemo(
    () => clinicTimezone?.trim() || DEFAULT_TIMEZONE,
    [clinicTimezone],
  );
  const date = useMemo(
    () => pickerIsoToLocalDate(selectedPickerIso),
    [selectedPickerIso],
  );

  useEffect(() => {
    if (!clinicTimezone || syncedClinicTzRef.current === clinicTz) return;
    syncedClinicTzRef.current = clinicTz;
    if (userPickedDateRef.current) return;
    const todayIso = formatClinicTodayPickerIso(clinicTz);
    setSelectedPickerIso(todayIso);
    setCalendarMonth(startOfMonth(pickerIsoToLocalDate(todayIso)));
  }, [clinicTimezone, clinicTz]);

  const handleDateSelect = useCallback(
    (next: Date | undefined) => {
      userPickedDateRef.current = true;
      const pickerIso = next
        ? formatClinicPickerDayIsoFromSelection(next, clinicTz)
        : formatClinicTodayPickerIso(clinicTz);
      setSelectedPickerIso(pickerIso);
      const normalized = pickerIsoToLocalDate(pickerIso);
      setCalendarMonth((prev) => {
        const target = startOfMonth(normalized);
        if (
          prev.getFullYear() === target.getFullYear() &&
          prev.getMonth() === target.getMonth()
        )
          return prev;
        return target;
      });
    },
    [clinicTz],
  );

  const handleCalendarMonthChange = useCallback((month: Date) => {
    setCalendarMonth(month);
  }, []);

  const isToday = useMemo(
    () => selectedPickerIso === formatClinicTodayPickerIso(clinicTz),
    [selectedPickerIso, clinicTz],
  );

  return {
    date,
    selectedPickerIso,
    clinicTz,
    setDate: handleDateSelect,
    calendarMonth,
    onCalendarMonthChange: handleCalendarMonthChange,
    isToday,
  };
}
