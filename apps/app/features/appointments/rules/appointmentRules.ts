import type { Appointment } from "@workspace/types";
import {
  addMinutes,
  differenceInMinutes,
  isAfter,
  isBefore,
  isToday,
  startOfMinute,
  subMinutes,
} from "date-fns";

export const isAppointmentPast = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.startTime);
  return isBefore(appointmentDate, new Date());
};

export const isAppointmentToday = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.startTime);
  return isToday(appointmentDate);
};

export const isAppointmentUpcoming = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.startTime);
  return isAfter(appointmentDate, new Date());
};

export const getAppointmentStatusDisplay = (status: string): string => {
  const normalizedStatus = status?.replace(/-/g, "_").toUpperCase();

  switch (normalizedStatus) {
    case "SCHEDULED":
      return "Scheduled";
    case "CHECKED_IN":
      return "Checked In";
    case "IN_PROGRESS":
      return "In Progress";
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

  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  return differenceInMinutes(end, start);
};

export const validateAppointmentData = (
  data: Partial<Appointment>,
): string[] => {
  const errors: string[] = [];

  if (!data.patientId) {
    errors.push("Select a patient.");
  }

  if (!data.doctorId) {
    errors.push("Select a doctor.");
  }

  if (!data.startTime) {
    errors.push("Choose a start time.");
  }

  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (isAfter(start, end)) {
      errors.push("Choose an end time after the start time.");
    }
  }

  return errors;
};
