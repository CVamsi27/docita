import type { Appointment } from "@workspace/types";
import { differenceInMinutes, isAfter, isBefore, isToday } from "date-fns";

/**
 * Appointment Business Rules
 * Pure functions for appointment-related business logic
 */

/**
 * Check if appointment is in the past
 */
export const isAppointmentPast = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.startTime);
  return isBefore(appointmentDate, new Date());
};

/**
 * Check if appointment is today
 */
export const isAppointmentToday = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.startTime);
  return isToday(appointmentDate);
};

/**
 * Check if appointment is upcoming
 */
export const isAppointmentUpcoming = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.startTime);
  return isAfter(appointmentDate, new Date());
};

/**
 * Get appointment status display
 */
export const getAppointmentStatusDisplay = (
  appointment: Appointment,
): {
  label: string;
  color: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} => {
  const status = appointment.status?.toUpperCase();

  switch (status) {
    case "SCHEDULED":
      return { label: "Scheduled", color: "text-blue-600", variant: "default" };
    case "CHECKED_IN":
      return {
        label: "Checked In",
        color: "text-green-600",
        variant: "secondary",
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        color: "text-purple-600",
        variant: "default",
      };
    case "COMPLETED":
      return { label: "Completed", color: "text-gray-600", variant: "outline" };
    case "CANCELLED":
      return {
        label: "Cancelled",
        color: "text-red-600",
        variant: "destructive",
      };
    case "NO_SHOW":
      return {
        label: "No Show",
        color: "text-orange-600",
        variant: "destructive",
      };
    default:
      return { label: "Unknown", color: "text-gray-500", variant: "outline" };
  }
};

/**
 * Check if appointment can be checked in
 */
export const canCheckIn = (appointment: Appointment): boolean => {
  if (
    appointment.status === "checked-in" ||
    appointment.status === "in-progress"
  ) {
    return false;
  }

  const appointmentDate = new Date(appointment.startTime);
  const now = new Date();
  const minutesDiff = differenceInMinutes(appointmentDate, now);

  // Can check in 15 minutes before appointment
  return minutesDiff >= -15 && minutesDiff <= 60;
};

/**
 * Check if appointment can be cancelled
 */
export const canCancel = (appointment: Appointment): boolean => {
  return (
    appointment.status !== "completed" && appointment.status !== "cancelled"
  );
};

/**
 * Check if appointment can be rescheduled
 */
export const canReschedule = (appointment: Appointment): boolean => {
  return (
    appointment.status === "scheduled" && isAppointmentUpcoming(appointment)
  );
};

/**
 * Get appointment duration in minutes
 */
export const getAppointmentDuration = (appointment: Appointment): number => {
  if (!appointment.endTime) return 30; // Default 30 minutes

  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  return differenceInMinutes(end, start);
};

/**
 * Validate appointment data
 */
export const validateAppointmentData = (
  data: Partial<Appointment>,
): string[] => {
  const errors: string[] = [];

  if (!data.patientId) {
    errors.push("Patient is required");
  }

  if (!data.doctorId) {
    errors.push("Doctor is required");
  }

  if (!data.startTime) {
    errors.push("Start time is required");
  }

  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (!isBefore(start, end)) {
      errors.push("End time must be after start time");
    }
  }

  return errors;
};
