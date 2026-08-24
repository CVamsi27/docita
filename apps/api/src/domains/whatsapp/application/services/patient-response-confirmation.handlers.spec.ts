import { describe, expect, it } from '@jest/globals';
import { resolvePatientConfirmationPlan } from './patient-response-confirmation.handlers';
import type { AppointmentContext } from './patient-response.types';

describe('resolvePatientConfirmationPlan', () => {
  const appointment = {
    id: 'appt-1',
    status: 'SCHEDULED',
    startTime: new Date('2026-04-01T10:00:00.000Z'),
    patient: {
      firstName: 'Rahul',
      lastName: 'Sharma',
      phoneNumber: '919876543210',
    },
    doctor: { id: 'doc-1', name: 'Dr. Patel' },
    clinic: { id: 'clinic-1', name: 'Test Clinic' },
  } satisfies AppointmentContext;

  const variables = {
    patientName: 'Rahul Sharma',
    clinicName: 'Test Clinic',
    date: '1 Apr 2026',
    time: '10:00 AM',
    doctorName: 'Dr. Patel',
    delayMinutes: '',
  };

  it('returns delay pending plain text', () => {
    const plan = resolvePatientConfirmationPlan(
      'DELAY',
      appointment,
      {
        delayMinutes: null,
        delayMinutesPending: true,
        conflictDetected: false,
        nextAppointmentTime: null,
      },
      variables,
    );

    expect(plan).toEqual({
      kind: 'plain_text',
      text: expect.stringContaining('expected delay in minutes'),
    });
  });

  it('returns confirm template from policy map', () => {
    const plan = resolvePatientConfirmationPlan(
      'CONFIRM',
      appointment,
      {
        delayMinutes: null,
        delayMinutesPending: false,
        conflictDetected: false,
        nextAppointmentTime: null,
      },
      variables,
    );

    expect(plan).toEqual({
      kind: 'template',
      templateId: 'patient_response_confirm',
    });
  });
});
