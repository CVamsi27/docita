import type { Appointment } from "@workspace/types";
import {
  addMinutes,
  getMinutesDifference,
  isFuture,
  isPast,
  isToday,
  startOfMinute,
  subMinutes,
} from "@workspace/utils";

export const isAppointmentPast = (appointment: Appointment): boolean => {
  return isPast(appointment.startTime);
};

export const isAppointmentToday = (appointment: Appointment): boolean => {
  return isToday(appointment.startTime);
};

export const isAppointmentUpcoming = (appointment: Appointment): boolean => {
  return isFuture(appointment.startTime);
};

/** Visit is finished: clinical record should not be edited in the consultation workspace. */
export const isConsultationReadOnlyStatus = (
  status: Appointment["status"] | string | undefined,
): boolean => status === "completed" || status === "no-show";

export { getAppointmentStatusDisplay } from "./appointment-status-display";
export { validateAppointmentData } from "./appointment-validation";

export const canCheckIn = (appointment: Appointment): boolean => {
  if (
    appointment.status === "checked-in" ||
    appointment.status === "in-progress"
  ) return false;

  const appointmentDate = startOfMinute(new Date(appointment.startTime));
  const now = startOfMinute(new Date());
  const earliestAllowedCheckInTime = subMinutes(appointmentDate, 60);
  const latestAllowedCheckInTime = addMinutes(appointmentDate, 15);

  return now >= earliestAllowedCheckInTime && now <= latestAllowedCheckInTime;
};

export const canCancel = (appointment: Appointment): boolean => {
  return (
    appointment.status !== "completed" && appointment.status !== "cancelled"
  );
};

export const canReschedule = (appointment: Appointment): boolean => {
  return (
    appointment.status === "scheduled" && isAppointmentUpcoming(appointment)
  );
};

/**
 * True when the row should expose its primary "Start / Resume / View" action.
 *
 * - completed / no-show: always show (button reads "View"; lets the doctor
 *   reopen the past consultation record).
 * - in-progress: always show (button reads "Resume").
 * - scheduled / checked-in: only show once the start time has arrived;
 *   before that the appointment is in the future and there is no visit
 *   to start. Reschedule / Cancel remain available.
 * - cancelled: never startable; the row still renders but with no primary CTA.
 */
export const canStartConsultationAtTime = (
  appointment: Pick<Appointment, "status" | "startTime">,
  now: Date = new Date(),
): boolean => {
  switch (appointment.status) {
    case "completed":
    case "no-show":
    case "in-progress":
      return true;
    case "cancelled":
      return false;
    case "scheduled":
    case "checked-in":
    default:
      return new Date(appointment.startTime).getTime() <= now.getTime();
  }
};

export const getAppointmentDuration = (appointment: Appointment): number => {
  if (!appointment.endTime) return 30;

  return getMinutesDifference(appointment.startTime, appointment.endTime);
};

