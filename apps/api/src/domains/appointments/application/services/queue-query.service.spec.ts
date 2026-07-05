import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueueQueryService } from './queue-query.service';
import type {
  IQueueRepository,
  QueueTokenWithRelations,
} from '@/domains/appointments/core/repositories/queue.repository.interface';
import type { AppointmentQueryService } from './appointment-query.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const NOW = new Date('2026-07-04T10:00:00.000Z');

function makeToken(
  overrides: Partial<QueueTokenWithRelations> = {},
): QueueTokenWithRelations {
  return {
    id: 'tok-1',
    clinicId: 'clinic-1',
    tokenNumber: 1,
    tokenType: 'scheduled',
    status: 'WAITING',
    priority: 0,
    scheduledTime: NOW,
    createdAt: NOW,
    calledAt: null,
    completedAt: null,
    consultationStart: null,
    estimatedWaitTime: null,
    appointmentId: 'appt-1',
    patient: {
      id: 'patient-1',
      firstName: 'A',
      lastName: 'B',
      phoneNumber: null,
      gender: null,
      dateOfBirth: null,
    },
    doctor: { id: 'doctor-1', name: 'Dr X' },
    appointment: {
      id: 'appt-1',
      type: 'Standard',
      chiefComplaint: null,
      doctor: { id: 'doctor-1', name: 'Dr X' },
    },
    ...overrides,
  } as unknown as QueueTokenWithRelations;
}

function makeCtx(tokens: QueueTokenWithRelations[]) {
  const queueRepository = {
    findTodayTokens: jest
      .fn<IQueueRepository['findTodayTokens']>()
      .mockResolvedValue(tokens),
  };
  const appointmentQueryService = {
    getClinicTimezone: jest.fn(async () => 'Asia/Kolkata'),
  };
  const clock: IClock = { now: () => NOW };
  const service = new QueueQueryService(
    queueRepository as unknown as IQueueRepository,
    clock,
    appointmentQueryService as unknown as AppointmentQueryService,
  );
  return { service, queueRepository };
}

describe('QueueQueryService.getTodayQueue', () => {
  it('aggregates status, token-type, and average-consultation stats', async () => {
    const tokens = [
      makeToken({ id: 't1', status: 'WAITING', tokenType: 'scheduled' }),
      makeToken({ id: 't2', status: 'IN_PROGRESS', tokenType: 'walk-in' }),
      makeToken({
        id: 't3',
        status: 'COMPLETED',
        tokenType: 'scheduled',
        consultationStart: new Date('2026-07-04T09:00:00.000Z'),
        completedAt: new Date('2026-07-04T09:20:00.000Z'),
      }),
    ];
    const { service } = makeCtx(tokens);

    const { patients, stats } = await service.getTodayQueue('clinic-1');

    expect(patients).toHaveLength(3);
    expect(stats).toMatchObject({
      total: 3,
      waiting: 1,
      pending: 1,
      inProgress: 1,
      completed: 1,
      walkIns: 1,
      scheduled: 2,
      noShow: 0,
      avgConsultationMinutes: 20,
    });
  });

  it('marks a token without an appointment as a queue-type patient', async () => {
    const { service } = makeCtx([
      makeToken({ id: 't-walkin', appointmentId: null, appointment: null }),
    ]);

    const { patients } = await service.getTodayQueue('clinic-1');

    expect(patients[0]?.type).toBe('queue');
    expect(patients[0]?.appointmentId).toBeNull();
  });
});

describe('QueueQueryService.getQueue', () => {
  it('requests only active (WAITING/IN_PROGRESS) tokens', async () => {
    const { service, queueRepository } = makeCtx([]);

    await service.getQueue('clinic-1', 'doctor-1', 'smith');

    expect(queueRepository.findTodayTokens).toHaveBeenCalledWith(
      'clinic-1',
      expect.any(Date),
      expect.any(Date),
      'doctor-1',
      ['WAITING', 'IN_PROGRESS'],
      'smith',
    );
  });
});
