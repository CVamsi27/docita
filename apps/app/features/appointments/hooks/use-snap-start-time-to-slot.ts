import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  addDays,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import type { CreateAppointmentInput } from "@workspace/types";
import {
  calendarSlotTimeToLocalIso,
  slotOccupiedByAppointments,
} from "@/features/appointments/lib/calendar-slot-local-iso";

interface AvailabilitySlot {
  doctorId: string;
  time: string;
  endTime: string;
  isAvailable: boolean;
}

interface BlockingAppointment {
  startTime: string | Date;
  endTime: string | Date;
  status: string;
}

interface UseSnapStartTimeToSlotParams {
  open: boolean | undefined;
  selectedDate: Date | undefined;
  watchedDoctorId: string | undefined;
  slots: AvailabilitySlot[];
  slotsQuerySuccess: boolean;
  slotsQueryError: boolean;
  clinicTimezone: string;
  blockingAppointmentsForSlots: BlockingAppointment[];
  form: UseFormReturn<CreateAppointmentInput>;
  onAdjustSchedulingDate?: (next: Date) => void;
}

function pickerDayDiff(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const fromT = new Date(fy!, fm! - 1, fd!, 12, 0, 0, 0).getTime();
  const toT = new Date(ty!, tm! - 1, td!, 12, 0, 0, 0).getTime();
  return Math.round((toT - fromT) / 86_400_000);
}

/**
 * Once availability slots load for the selected (doctor, day), snap `startTime`
 * to the first bookable slot. If no slot is bookable on `today`, walk forward up
 * to 14 days via `onAdjustSchedulingDate`. Preserves user edits when valid.
 */
export function useSnapStartTimeToSlot({
  open,
  selectedDate,
  watchedDoctorId,
  slots,
  slotsQuerySuccess,
  slotsQueryError,
  clinicTimezone,
  blockingAppointmentsForSlots,
  form,
  onAdjustSchedulingDate,
}: UseSnapStartTimeToSlotParams): void {
  const autoAdvanceChainOriginStrRef = useRef<string | null>(null);
  const autoAdvanceChainActiveRef = useRef(false);
  const lastAutoAdvanceFromDayStrRef = useRef<string | null>(null);
  const startSnapContextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      autoAdvanceChainOriginStrRef.current = null;
      autoAdvanceChainActiveRef.current = false;
      lastAutoAdvanceFromDayStrRef.current = null;
      startSnapContextRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !selectedDate || !watchedDoctorId) return;
    if (!slotsQuerySuccess || slotsQueryError) return;

    const snapKey = `${watchedDoctorId}|${formatClinicPickerDayIsoFromSelection(selectedDate, clinicTimezone)}`;
    const doctorSlots = slots.filter((s) => s.doctorId === watchedDoctorId);
    const availableIsos = doctorSlots
      .filter(
        (s) =>
          s.isAvailable &&
          !slotOccupiedByAppointments(
            selectedDate,
            s.time,
            s.endTime,
            clinicTimezone,
            blockingAppointmentsForSlots,
          ),
      )
      .map((s) =>
        calendarSlotTimeToLocalIso(selectedDate, s.time, clinicTimezone),
      );

    const currentRaw = form.getValues("startTime");
    const currentStr =
      typeof currentRaw === "string"
        ? currentRaw
        : currentRaw instanceof Date
          ? ""
          : "";

    const currentPickIsValid =
      currentStr.length > 0 && availableIsos.includes(currentStr);

    const startTimeState = form.getFieldState("startTime");
    if (
      startTimeState.isDirty &&
      startSnapContextRef.current === snapKey &&
      currentPickIsValid
    ) {
      return;
    }

    const firstAvailable = doctorSlots.find((s) => {
      if (!s.isAvailable) return false;
      return !slotOccupiedByAppointments(
        selectedDate,
        s.time,
        s.endTime,
        clinicTimezone,
        blockingAppointmentsForSlots,
      );
    });

    if (firstAvailable) {
      autoAdvanceChainOriginStrRef.current = null;
      autoAdvanceChainActiveRef.current = false;
      lastAutoAdvanceFromDayStrRef.current = null;

      const nextIso = calendarSlotTimeToLocalIso(
        selectedDate,
        firstAvailable.time,
        clinicTimezone,
      );
      const nextEndIso = calendarSlotTimeToLocalIso(
        selectedDate,
        firstAvailable.endTime,
        clinicTimezone,
      );
      form.setValue("startTime", nextIso, {
        shouldDirty: false,
        shouldValidate: true,
      });
      form.setValue("endTime", nextEndIso, {
        shouldDirty: false,
        shouldValidate: true,
      });
      startSnapContextRef.current = snapKey;
      return;
    }

    const todayStr = formatClinicTodayPickerIso(clinicTimezone);
    const selectedStr = formatClinicPickerDayIsoFromSelection(
      selectedDate,
      clinicTimezone,
    );

    if (!autoAdvanceChainActiveRef.current && onAdjustSchedulingDate) {
      if (selectedStr === todayStr) {
        autoAdvanceChainActiveRef.current = true;
        autoAdvanceChainOriginStrRef.current = todayStr;
      }
    }

    if (
      autoAdvanceChainActiveRef.current &&
      autoAdvanceChainOriginStrRef.current &&
      onAdjustSchedulingDate
    ) {
      const origin = autoAdvanceChainOriginStrRef.current;
      const daysFromOrigin = pickerDayDiff(origin, selectedStr);
      if (daysFromOrigin >= 14) {
        autoAdvanceChainActiveRef.current = false;
        autoAdvanceChainOriginStrRef.current = null;
        lastAutoAdvanceFromDayStrRef.current = null;
      } else {
        if (lastAutoAdvanceFromDayStrRef.current === selectedStr) {
          return;
        }
        lastAutoAdvanceFromDayStrRef.current = selectedStr;
        onAdjustSchedulingDate(addDays(selectedDate, 1));
        return;
      }
    }

    form.setValue("startTime", "", { shouldDirty: false, shouldValidate: true });
    startSnapContextRef.current = null;
  }, [
    open,
    selectedDate,
    watchedDoctorId,
    slots,
    slotsQuerySuccess,
    slotsQueryError,
    clinicTimezone,
    blockingAppointmentsForSlots,
    form,
    onAdjustSchedulingDate,
  ]);
}
