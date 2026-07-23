import { parseQueueTokenType, calcAvgConsultationMinutes, mapQueueToken, getTodayRange } from './queue-token.helpers';
import type { QueueTokenWithRelations } from '@/domains/appointments/core/repositories/queue.repository.interface';
import type { IClock } from '@/shared/common/ports/clock.port';
import { QueueTokenStatus } from '@workspace/db';

describe('getTodayRange', () => {
  it('returns today and tomorrow bounds in UTC', () => {
    const fixedTime = new Date('2026-07-23T14:30:00Z');
    const clock: IClock = { now: () => fixedTime };
    const result = getTodayRange(clock, 'Asia/Kolkata');
    expect(result.today).toBeInstanceOf(Date);
    expect(result.tomorrow).toBeInstanceOf(Date);
    expect(result.tomorrow.getTime()).toBeGreaterThan(result.today.getTime());
  });

  it('returns 24-hour difference between today and tomorrow', () => {
    const fixedTime = new Date('2026-07-23T05:00:00Z');
    const clock: IClock = { now: () => fixedTime };
    const result = getTodayRange(clock, 'UTC');
    const diffMs = result.tomorrow.getTime() - result.today.getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });
});

describe('parseQueueTokenType', () => {
  it('returns the valid token type when given a known value', () => {
    expect(parseQueueTokenType('scheduled')).toBe('scheduled');
    expect(parseQueueTokenType('walk-in')).toBe('walk-in');
    expect(parseQueueTokenType('late-arrival')).toBe('late-arrival');
    expect(parseQueueTokenType('pending')).toBe('pending');
  });

  it('returns pending for an unknown value', () => {
    expect(parseQueueTokenType('unknown')).toBe('pending');
    expect(parseQueueTokenType('')).toBe('pending');
  });
});

describe('calcAvgConsultationMinutes', () => {
  it('returns 0 for an empty array', () => {
    expect(calcAvgConsultationMinutes([])).toBe(0);
  });

  it('returns 0 when all entries have missing dates', () => {
    const completed = [
      { consultationStart: null, completedAt: null },
      { consultationStart: new Date('2026-01-01T10:00:00Z'), completedAt: null },
    ];
    expect(calcAvgConsultationMinutes(completed)).toBe(0);
  });

  it('calculates average consultation time in minutes', () => {
    const start1 = new Date('2026-01-01T10:00:00Z');
    const end1 = new Date('2026-01-01T10:30:00Z'); // 30 minutes
    const start2 = new Date('2026-01-01T11:00:00Z');
    const end2 = new Date('2026-01-01T11:20:00Z'); // 20 minutes
    const completed = [
      { consultationStart: start1, completedAt: end1 },
      { consultationStart: start2, completedAt: end2 },
    ];
    // (30 + 20) / 2 = 25
    expect(calcAvgConsultationMinutes(completed)).toBe(25);
  });

  it('rounds the result to the nearest integer', () => {
    const start1 = new Date('2026-01-01T10:00:00Z');
    const end1 = new Date('2026-01-01T10:00:45Z'); // 45 seconds
    const start2 = new Date('2026-01-01T11:00:00Z');
    const end2 = new Date('2026-01-01T11:01:15Z'); // 75 seconds
    const completed = [
      { consultationStart: start1, completedAt: end1 },
      { consultationStart: start2, completedAt: end2 },
    ];
    // (45 + 75) / 2 = 60 seconds = 1 minute
    expect(calcAvgConsultationMinutes(completed)).toBe(1);
  });
});

describe('mapQueueToken', () => {
  it('maps a QueueTokenWithRelations to the expected output shape', () => {
    const now = new Date('2026-07-23T12:00:00Z');
    const calledAt = new Date('2026-07-23T12:05:00Z');
    const completedAt = new Date('2026-07-23T12:35:00Z');
    const scheduledTime = new Date('2026-07-23T14:00:00Z');
    const consultationStart = new Date('2026-07-23T12:10:00Z');

    const input: QueueTokenWithRelations = {
      id: 'tok-1',
      clinicId: 'clinic-1',
      patientId: 'pat-1',
      appointmentId: 'appt-1',
      doctorId: 'doc-1',
      tokenNumber: 5,
      status: QueueTokenStatus.IN_PROGRESS,
      priority: 1,
      notes: 'Follow-up',
      calledAt,
      completedAt,
      createdAt: now,
      tokenType: 'walk-in',
      scheduledTime,
      estimatedDuration: 30,
      estimatedWaitTime: 15,
      consultationStart,
      consultationEnd: null,
      updatedAt: now,
      patient: { id: 'pat-1', firstName: 'John' } as any,
      doctor: { id: 'doc-1', firstName: 'Dr. Smith' } as any,
      appointment: { id: 'appt-1' } as any,
    };

    const result = mapQueueToken(input);

    expect(result).toEqual({
      id: 'tok-1',
      clinicId: 'clinic-1',
      patientId: 'pat-1',
      appointmentId: 'appt-1',
      doctorId: 'doc-1',
      tokenNumber: 5,
      status: QueueTokenStatus.IN_PROGRESS,
      priority: 1,
      notes: 'Follow-up',
      calledAt: calledAt.toISOString(),
      completedAt: completedAt.toISOString(),
      createdAt: now.toISOString(),
      tokenType: 'walk-in',
      scheduledTime: scheduledTime.toISOString(),
      estimatedDuration: 30,
      estimatedWaitTime: 15,
      consultationStart: consultationStart.toISOString(),
      patient: { id: 'pat-1', firstName: 'John' },
      doctor: { id: 'doc-1', firstName: 'Dr. Smith' },
      appointment: { id: 'appt-1' },
    });
  });
});
