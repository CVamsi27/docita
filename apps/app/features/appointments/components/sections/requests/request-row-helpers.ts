import type { AppointmentRequestResponse } from "@workspace/types";
import {
  clinicDateAndTimeToWallDatetimeLocal,
  formatClinicPickerDayIsoFromSelection,
  formatScheduleTime,
  utcInstantToClinicWallDatetimeLocal,
  getPatientFullName,
} from "@workspace/utils";
import {
  formatClockTime,
  formatLocaleDateShortMonthYear,
} from "@/lib/formatters";

export const REJECT_REASON_CUSTOM = "CUSTOM";

export const REJECT_REASON_OPTIONS: { value: string; label: string }[] = [
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

export type SchedulableDoctor = {
  id: string;
  name: string | null;
  role: string;
};

export function utcRequestedSlotToWallLocal(
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

export function preferredDateTimeWallLocal(
  preferredDate: string | Date,
  preferredTime: string | null | undefined,
  timezone: string,
): string {
  const dateStr =
    typeof preferredDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(preferredDate.trim())
      ? preferredDate.trim()
      : formatClinicPickerDayIsoFromSelection(
          new Date(preferredDate),
          timezone,
        );
  const hhmm =
    preferredTime && /^\d{2}:\d{2}$/.test(preferredTime.trim())
      ? preferredTime.trim()
      : "09:00";
  return clinicDateAndTimeToWallDatetimeLocal(dateStr, hhmm, timezone);
}

export function patientName(request: AppointmentRequestResponse): string {
  const firstName = request.patient?.firstName ?? "";
  const lastName = request.patient?.lastName ?? "";
  return getPatientFullName({ firstName, lastName }, "Patient");
}

export function patientPhone(
  request: AppointmentRequestResponse,
): string | null {
  const raw = request.patient?.phoneNumber;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

export function pickerIsoToLocalNoonDate(pickerIso: string): Date | null {
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

export function parsePickerIsoToLocalDate(pickerIso: string): Date | null {
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

export function schedulingSummaryLines(request: AppointmentRequestResponse): {
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
