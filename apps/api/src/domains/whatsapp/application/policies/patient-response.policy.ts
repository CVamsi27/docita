import { AppointmentStatus } from '@workspace/db';

export type PatientResponseType =
  | 'CONFIRM'
  | 'ON_THE_WAY'
  | 'DELAY'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'UNKNOWN';

type StaffNotificationPriority = 'HIGH' | 'LOW' | 'NORMAL';

type StaffNotificationType =
  | 'PATIENT_RESPONSE'
  | 'APPOINTMENT_CANCEL'
  | 'APPOINTMENT_DELAY';

export const EXACT_RESPONSE_MAPPING: Record<string, PatientResponseType> = {
  btn_confirm: 'CONFIRM',
  btn_on_the_way: 'ON_THE_WAY',
  i_am_on_my_way: 'ON_THE_WAY',
  btn_on_time: 'ON_THE_WAY',
  on_time: 'ON_THE_WAY',
  btn_delay: 'DELAY',
  btn_delayed: 'DELAY',
  btn_reschedule: 'RESCHEDULE',
  btn_cancel: 'CANCEL',
  btn_cancelled: 'CANCEL',
  cancel_appointment: 'CANCEL',
  confirm_appointment: 'CONFIRM',
  reschedule_appointment: 'RESCHEDULE',

  confirm: 'CONFIRM',
  on_the_way: 'ON_THE_WAY',
  ontime: 'ON_THE_WAY',
  delay: 'DELAY',
  delayed: 'DELAY',
  reschedule: 'RESCHEDULE',
  cancel: 'CANCEL',
  cancelled: 'CANCEL',
  canceled: 'CANCEL',

  '1': 'CONFIRM',
  '2': 'DELAY',
  '3': 'RESCHEDULE',
  '4': 'CANCEL',

  yes: 'CONFIRM',
  ok: 'CONFIRM',
  okay: 'CONFIRM',
  confirmed: 'CONFIRM',
  coming: 'ON_THE_WAY',
  no: 'CANCEL',
};

export const INCLUDES_RESPONSE_PATTERNS: ReadonlyArray<{
  needle: string;
  type: PatientResponseType;
}> = [
  { needle: 'on my way', type: 'ON_THE_WAY' },
  { needle: 'on the way', type: 'ON_THE_WAY' },
  { needle: 'on time', type: 'ON_THE_WAY' },
  { needle: 'running late', type: 'DELAY' },
  { needle: 'late by', type: 'DELAY' },
  { needle: 'cancel appointment', type: 'CANCEL' },
  { needle: 'reschedule', type: 'RESCHEDULE' },
  { needle: 'cancelled', type: 'CANCEL' },
  { needle: 'canceled', type: 'CANCEL' },
  { needle: 'cancel', type: 'CANCEL' },
  { needle: 'delayed', type: 'DELAY' },
  { needle: 'late', type: 'DELAY' },
  { needle: 'confirm', type: 'CONFIRM' },
];

/** Maps patient reply type to appointment status when a DB update is required. */
export const APPOINTMENT_STATUS_BY_PATIENT_RESPONSE: Partial<
  Record<PatientResponseType, AppointmentStatus>
> = {
  CONFIRM: AppointmentStatus.CONFIRMED,
  ON_THE_WAY: AppointmentStatus.CONFIRMED,
  CANCEL: AppointmentStatus.CANCELLED,
  RESCHEDULE: AppointmentStatus.RESCHEDULING,
};

/**
 * Appointment statuses a reply may legally transition FROM. Guards against
 * retroactive corruption — e.g. a bare "no" (CANCEL) must never flip a
 * COMPLETED or IN_PROGRESS visit to CANCELLED. A reply whose current status
 * is not a legal predecessor is logged and ignored.
 */
export const LEGAL_PREDECESSORS_BY_PATIENT_RESPONSE: Partial<
  Record<PatientResponseType, ReadonlyArray<AppointmentStatus>>
> = {
  CONFIRM: [AppointmentStatus.SCHEDULED],
  ON_THE_WAY: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
  CANCEL: [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.RESCHEDULING,
  ],
  RESCHEDULE: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
};

export const PATIENT_CONFIRMATION_TEMPLATE_BY_RESPONSE: Partial<
  Record<PatientResponseType, string>
> = {
  CONFIRM: 'patient_response_confirm',
  ON_THE_WAY: 'patient_response_confirm',
  DELAY: 'patient_response_delay',
  RESCHEDULE: 'patient_response_reschedule',
  CANCEL: 'patient_response_cancel',
};

export const STAFF_PRIORITY_BY_PATIENT_RESPONSE: Record<
  PatientResponseType,
  StaffNotificationPriority
> = {
  CANCEL: 'HIGH',
  RESCHEDULE: 'HIGH',
  CONFIRM: 'LOW',
  ON_THE_WAY: 'LOW',
  DELAY: 'NORMAL',
  UNKNOWN: 'NORMAL',
};

export const STAFF_NOTIFICATION_TYPE_BY_RESPONSE: Record<
  PatientResponseType,
  StaffNotificationType
> = {
  CANCEL: 'APPOINTMENT_CANCEL',
  DELAY: 'APPOINTMENT_DELAY',
  CONFIRM: 'PATIENT_RESPONSE',
  ON_THE_WAY: 'PATIENT_RESPONSE',
  RESCHEDULE: 'PATIENT_RESPONSE',
  UNKNOWN: 'PATIENT_RESPONSE',
};
