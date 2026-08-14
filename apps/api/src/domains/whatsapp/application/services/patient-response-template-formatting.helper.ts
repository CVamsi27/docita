import {
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
  formatDate,
  formatTime,
  getPatientFullName,
} from '@workspace/utils';
import type { AppointmentContext } from './patient-response.types';

const APPOINTMENT_TIME_FORMAT = 'h:mm a';

/**
 * Renders a timestamp the way patient-response WhatsApp templates expect —
 * `'h:mm a'` in the clinic's default timezone. `PatientResponseConfirmationService`
 * and `PatientResponseStaffNotificationService` both format the appointment's
 * start time (and, for staff alerts, the rescheduled slot) this way; sharing
 * it keeps the format string and timezone from drifting between sends.
 */
export function formatAppointmentResponseTime(date: Date): string {
  return formatTime(date, APPOINTMENT_TIME_FORMAT, {
    timezone: DEFAULT_TIMEZONE,
  });
}

/**
 * Template variables both patient-response senders derive directly from the
 * `AppointmentContext` — the patient's display name plus the appointment's
 * date/time rendered in the clinic's default timezone. Sharing this keeps
 * those two senders' WhatsApp templates from drifting on formatting.
 */
export function buildAppointmentResponseBasics(
  appointment: AppointmentContext,
): {
  patientName: string;
  date: string;
  time: string;
} {
  return {
    patientName: getPatientFullName(appointment.patient),
    date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
      timezone: DEFAULT_TIMEZONE,
    }),
    time: formatAppointmentResponseTime(appointment.startTime),
  };
}
