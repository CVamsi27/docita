import { describe, expect, it } from '@jest/globals';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

const START = new Date('2026-07-10T10:00:00Z');
const END = new Date('2026-07-10T10:30:00Z');
const NOW = new Date('2026-07-03T09:00:00Z');

function makeAppointment(
  status: AppointmentStatus = AppointmentStatus.scheduled(),
) {
  return new Appointment({
    id: 'a1',
    clinicId: 'c1',
    patientId: 'p1',
    doctorId: 'doc-1',
    startTime: START,
    endTime: END,
    status,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    version: 1,
  });
}

describe('Appointment.reschedule', () => {
  it('moves the appointment to a new time (status unchanged)', () => {
    const appt = makeAppointment();
    const newStart = new Date('2026-07-11T11:00:00Z');
    const newEnd = new Date('2026-07-11T11:30:00Z');

    appt.reschedule(newStart, newEnd, NOW);

    expect(appt.getStartTime()).toEqual(newStart);
    expect(appt.getEndTime()).toEqual(newEnd);
    expect(appt.getStatus().isScheduled()).toBe(true);
  });

  it('rejects rescheduling a completed or cancelled appointment', () => {
    expect(() =>
      makeAppointment(AppointmentStatus.completed()).reschedule(
        START,
        END,
        NOW,
      ),
    ).toThrow(InvariantViolationError);
    expect(() =>
      makeAppointment(AppointmentStatus.cancelled()).reschedule(
        START,
        END,
        NOW,
      ),
    ).toThrow(InvariantViolationError);
  });

  it('rejects a start time that is not before the end time', () => {
    expect(() => makeAppointment().reschedule(END, START, NOW)).toThrow(
      InvariantViolationError,
    );
  });
});

describe('Appointment.cancel', () => {
  it('cancels an active appointment with a reason', () => {
    const appt = makeAppointment();
    appt.cancel('Patient request', NOW);
    expect(appt.getStatus().isCancelled()).toBe(true);
  });

  it('is idempotent when already cancelled', () => {
    const appt = makeAppointment(AppointmentStatus.cancelled());
    expect(() => appt.cancel('again', NOW)).not.toThrow();
    expect(appt.getStatus().isCancelled()).toBe(true);
  });

  it('rejects cancelling a completed appointment', () => {
    expect(() =>
      makeAppointment(AppointmentStatus.completed()).cancel('too late', NOW),
    ).toThrow(InvariantViolationError);
  });
});
