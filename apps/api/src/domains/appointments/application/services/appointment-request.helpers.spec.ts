import { BadRequestException } from '@nestjs/common';
import type { AppointmentRequestWithRelations } from '@/domains/appointments/core/repositories/appointment-request.repository.interface';
import {
  parseAppointmentRequestDate,
  mapAppointmentRequest,
} from './appointment-request.helpers';

describe('parseAppointmentRequestDate', () => {
  it('returns a valid Date for a valid ISO string', () => {
    const result = parseAppointmentRequestDate(
      '2026-03-15T10:30:00.000Z',
      'preferredDate',
    );
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2026-03-15T10:30:00.000Z');
  });

  it('returns a valid Date for a date-only string', () => {
    const result = parseAppointmentRequestDate('2026-06-01', 'preferredDate');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
  });

  it('throws BadRequestException for an invalid date string', () => {
    expect(() =>
      parseAppointmentRequestDate('not-a-date', 'preferredDate'),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException with the field name in the message', () => {
    expect(() => parseAppointmentRequestDate('invalid', 'customField')).toThrow(
      'customField must be a valid date',
    );
  });

  it('throws BadRequestException for an empty string', () => {
    expect(() => parseAppointmentRequestDate('', 'preferredDate')).toThrow(
      BadRequestException,
    );
  });
});

describe('mapAppointmentRequest', () => {
  function createBaseRequest(): AppointmentRequestWithRelations {
    const now = new Date('2026-07-20T08:00:00.000Z');
    return {
      id: 'req-1',
      patientId: 'pat-1',
      clinicId: 'clinic-1',
      preferredDoctorId: 'doc-1',
      preferredDate: new Date('2026-07-25T00:00:00.000Z'),
      preferredTime: '10:00',
      requestedSlotStart: new Date('2026-07-25T10:00:00.000Z'),
      requestedSlotEnd: new Date('2026-07-25T10:30:00.000Z'),
      reason: 'Follow-up',
      notes: 'Bring reports',
      status: 'PENDING',
      reviewedById: null,
      reviewedAt: null,
      responseMessage: null,
      createdAt: now,
      updatedAt: now,
      patient: {
        id: 'pat-1',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
      },
      preferredDoctor: { id: 'doc-1', name: 'Dr. Smith' },
      reviewedBy: null,
    } as AppointmentRequestWithRelations;
  }

  it('maps all fields correctly', () => {
    const request = createBaseRequest();
    const result = mapAppointmentRequest(request);

    expect(result.id).toBe('req-1');
    expect(result.patientId).toBe('pat-1');
    expect(result.clinicId).toBe('clinic-1');
    expect(result.preferredDoctorId).toBe('doc-1');
    expect(result.preferredTime).toBe('10:00');
    expect(result.reason).toBe('Follow-up');
    expect(result.notes).toBe('Bring reports');
    expect(result.status).toBe('PENDING');
    expect(result.patient).toEqual(request.patient);
    expect(result.preferredDoctor).toEqual(request.preferredDoctor);
    expect(result.reviewedBy).toBeUndefined();
  });

  it('converts null optional dates to undefined', () => {
    const request = createBaseRequest();
    request.requestedSlotStart = null;
    request.requestedSlotEnd = null;
    const result = mapAppointmentRequest(request);

    expect(result.requestedSlotStart).toBeUndefined();
    expect(result.requestedSlotEnd).toBeUndefined();
  });

  it('converts null relations to undefined', () => {
    const request = createBaseRequest();
    request.patient = null;
    request.preferredDoctor = null;
    const result = mapAppointmentRequest(request);

    expect(result.patient).toBeUndefined();
    expect(result.preferredDoctor).toBeUndefined();
  });

  it('preserves reviewedBy when present', () => {
    const request = createBaseRequest();
    request.reviewedBy = { id: 'admin-1', name: 'Admin' };
    const result = mapAppointmentRequest(request);

    expect(result.reviewedBy).toEqual({ id: 'admin-1', name: 'Admin' });
  });

  it('maps reviewedAt and responseMessage when present', () => {
    const request = createBaseRequest();
    const reviewedAt = new Date('2026-07-21T09:00:00.000Z');
    request.reviewedAt = reviewedAt;
    request.responseMessage = 'Approved';
    request.reviewedById = 'admin-1';
    const result = mapAppointmentRequest(request);

    expect(result.reviewedAt).toBe(reviewedAt);
    expect(result.responseMessage).toBe('Approved');
    expect(result.reviewedById).toBe('admin-1');
  });
});
