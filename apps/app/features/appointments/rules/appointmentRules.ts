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

export const getAppointmentStatusDisplay = (status: string): string => {
  const normalizedStatus = status?.replace(/-/g, "_").toUpperCase();

  switch (normalizedStatus) {
    case "SCHEDULED":
      return "Scheduled";
    case "CHECKED_IN":
      return "Checked In";
    case "IN_PROGRESS":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No Show";
    default:
      return "Unknown";
  }
};

export const canCheckIn = (appointment: Appointment): boolean => {
  if (
    appointment.status === "checked-in" ||
    appointment.status === "in-progress"
  ) {
    return false;
  }

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

export const getAppointmentDuration = (appointment: Appointment): number => {
  if (!appointment.endTime) return 30;

  return getMinutesDifference(appointment.startTime, appointment.endTime);
};

export const validateAppointmentData = (
  data: Partial<Appointment>,
): string[] => {
  const errors: string[] = [];

  if (!data.patientId) {
    errors.push("Select a patient");
  }

  if (!data.doctorId) {
    errors.push("Select a doctor");
  }

  if (!data.startTime) {
    errors.push("Choose a start time");
  }

  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (start.getTime() > end.getTime()) {
      errors.push("Choose an end time after the start time");
    }
  }

  return errors;
};
