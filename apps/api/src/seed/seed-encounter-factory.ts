import { AppointmentStatus } from '@workspace/db';
import { RAJESH_APPOINTMENT_ID } from './seed-constants';
import { SEEDED_PATIENTS } from './seed-patient-factory';

export type SeedDoctorKey = 'admin' | 'd1' | 'd2';

export const APPOINTMENT_NOTES = [
  'Routine follow-up consultation',
  'Annual health checkup',
  'Medication review',
  'Acute symptoms assessment',
  'Post-procedure follow-up',
  'Lifestyle counselling',
  'Lab results review',
  'Pre-operative consultation',
];

export interface AppointmentPlan {
  id: string;
  patientIndex: number;
  doctorKey: SeedDoctorKey;
  daysOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
  status: AppointmentStatus;
  type: string;
  note: string;
}

export function buildAppointmentPlans(): AppointmentPlan[] {
  return [
    ...buildPastAppointmentPlans(),
    ...buildTodayAppointmentPlans(),
    ...buildFutureAppointmentPlans(),
    getRajeshCanonicalAppointmentPlan(),
  ];
}

/**
 * A full, realistic clinic day for the demo login (admin.doctor), so the
 * Appointments calendar and Today queue look busy on camera instead of
 * empty. Mixed statuses tell the story of a day in progress: earlier slots
 * done, one in progress now, the rest still to come.
 */
function buildTodayAppointmentPlans(): AppointmentPlan[] {
  const slots: Array<{
    hour: number;
    minute: number;
    patientIndex: number;
    status: AppointmentStatus;
    type: string;
  }> = [
    {
      hour: 9,
      minute: 0,
      patientIndex: 4,
      status: AppointmentStatus.COMPLETED,
      type: 'consultation',
    },
    {
      hour: 9,
      minute: 30,
      patientIndex: 8,
      status: AppointmentStatus.COMPLETED,
      type: 'follow-up',
    },
    {
      hour: 10,
      minute: 0,
      patientIndex: 12,
      status: AppointmentStatus.COMPLETED,
      type: 'check-up',
    },
    {
      hour: 10,
      minute: 30,
      patientIndex: 2,
      status: AppointmentStatus.IN_PROGRESS,
      type: 'consultation',
    },
    {
      hour: 11,
      minute: 0,
      patientIndex: 15,
      status: AppointmentStatus.CONFIRMED,
      type: 'follow-up',
    },
    {
      hour: 11,
      minute: 30,
      patientIndex: 19,
      status: AppointmentStatus.CONFIRMED,
      type: 'consultation',
    },
    {
      hour: 12,
      minute: 0,
      patientIndex: 6,
      status: AppointmentStatus.SCHEDULED,
      type: 'check-up',
    },
    {
      hour: 14,
      minute: 30,
      patientIndex: 10,
      status: AppointmentStatus.CONFIRMED,
      type: 'consultation',
    },
    {
      hour: 15,
      minute: 0,
      patientIndex: 21,
      status: AppointmentStatus.SCHEDULED,
      type: 'follow-up',
    },
  ];

  return slots.map((slot, i) => ({
    id: `seed-apt-today-${i.toString().padStart(2, '0')}`,
    patientIndex: slot.patientIndex % SEEDED_PATIENTS.length,
    doctorKey: 'admin',
    daysOffset: 0,
    hour: slot.hour,
    minute: slot.minute,
    durationMin: 30,
    status: slot.status,
    type: slot.type,
    note: APPOINTMENT_NOTES[i % APPOINTMENT_NOTES.length],
  }));
}

function buildPastAppointmentPlans(): AppointmentPlan[] {
  const typeCycle = [
    'consultation',
    'follow-up',
    'check-up',
    'consultation',
    'follow-up',
  ];
  const plans: AppointmentPlan[] = [];

  for (let i = 0; i < 55; i++) {
    const patientIndex = i % SEEDED_PATIENTS.length;
    const daysOffset = -(60 - Math.floor((i * 60) / 55));
    const status =
      i % 11 === 0
        ? AppointmentStatus.CANCELLED
        : i % 13 === 0
          ? AppointmentStatus.NO_SHOW
          : AppointmentStatus.COMPLETED;
    plans.push({
      id: `seed-apt-past-${i.toString().padStart(2, '0')}`,
      patientIndex,
      doctorKey: (['admin', 'd1', 'd2'] as const)[i % 3],
      daysOffset,
      hour: 9 + (i % 8),
      minute: (i % 2) * 30,
      durationMin: 30,
      status,
      type: typeCycle[i % typeCycle.length],
      note: APPOINTMENT_NOTES[i % APPOINTMENT_NOTES.length],
    });
  }

  return plans;
}

function buildFutureAppointmentPlans(): AppointmentPlan[] {
  const plans: AppointmentPlan[] = [];
  const statusCycle: AppointmentStatus[] = [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CANCELLED,
  ];
  const typeCycle = [
    'consultation',
    'follow-up',
    'check-up',
    'consultation',
    'follow-up',
  ];

  for (let i = 0; i < 25; i++) {
    const patientIndex = (i * 3) % SEEDED_PATIENTS.length;
    const daysOffset = Math.floor((i * 30) / 25) + 1;
    const status =
      i % 3 === 0 ? AppointmentStatus.SCHEDULED : AppointmentStatus.CONFIRMED;
    plans.push({
      id: `seed-apt-future-${i.toString().padStart(2, '0')}`,
      patientIndex,
      doctorKey: (['admin', 'd2', 'd1'] as const)[i % 3],
      daysOffset,
      hour: 10 + (i % 7),
      minute: (i % 2) * 30,
      durationMin: 30,
      status:
        statusCycle[i % statusCycle.length] === AppointmentStatus.COMPLETED
          ? status
          : statusCycle[i % statusCycle.length],
      type: typeCycle[i % typeCycle.length],
      note: APPOINTMENT_NOTES[i % APPOINTMENT_NOTES.length],
    });
  }

  return plans;
}

function getRajeshCanonicalAppointmentPlan(): AppointmentPlan {
  return {
    id: RAJESH_APPOINTMENT_ID,
    patientIndex: 0,
    doctorKey: 'd1',
    daysOffset: 0,
    hour: 9,
    minute: 0,
    durationMin: 30,
    status: AppointmentStatus.COMPLETED,
    type: 'consultation',
    note: 'Regular checkup for diabetes management',
  };
}
