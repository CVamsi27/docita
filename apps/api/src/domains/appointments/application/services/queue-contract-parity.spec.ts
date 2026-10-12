import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueueTokenStatus } from '@workspace/db';
import {
  queueListResponseSchema,
  queueTokenStatusSchema,
  todayQueueResponseSchema,
} from '@workspace/types';
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
    patientId: 'patient-1',
    tokenNumber: 1,
    tokenType: 'scheduled',
    status: 'WAITING',
    priority: 0,
    notes: null,
    scheduledTime: NOW,
    createdAt: NOW,
    calledAt: null,
    completedAt: null,
    consultationStart: null,
    estimatedWaitTime: null,
    estimatedDuration: 15,
    appointmentId: 'appt-1',
    doctorId: 'doctor-1',
    patient: {
      id: 'patient-1',
      firstName: 'Asha',
      lastName: 'Rao',
      phoneNumber: null,
      gender: null,
      dateOfBirth: null,
    },
    doctor: { id: 'doctor-1', name: 'Dr X' },
    appointment: {
      id: 'appt-1',
      type: 'Standard',
      chiefComplaint: 'Fever',
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
  return { service };
}

/**
 * Contract parity between `QueueController` and the client schemas.
 *
 * `queueListResponseSchema` / `todayQueueResponseSchema` in
 * `packages/types/src/contracts/queue.ts` are what the SPA parses these two
 * responses with. They used to be three independent hand-written interfaces,
 * and each one had drifted: one typed `priority` as `string` (the server sends
 * a Prisma `Int`), one typed `checkInTime` as nullable (it is derived from
 * `createdAt` and always present), one omitted `chiefComplaint` entirely, and
 * one advertised `appointment.startTime`, which the queue repository never
 * selects.
 *
 * These tests run the real projections — not hand-written fixtures — through the
 * client schemas, so the next mapper change that the client cannot absorb fails
 * here instead of surfacing as a blank dashboard row in production.
 */
describe('queue endpoint contract parity', () => {
  describe('GET /queue', () => {
    let rows: unknown;
    let tokens: QueueTokenWithRelations[];

    beforeEach(async () => {
      tokens = [
        makeToken(),
        makeToken({
          id: 'tok-2',
          appointmentId: null,
          doctorId: null,
          doctor: null,
          appointment: null,
          tokenType: 'walk-in',
          status: 'IN_PROGRESS',
          notes: 'BP high',
          scheduledTime: null,
          calledAt: new Date('2026-07-04T09:30:00.000Z'),
          consultationStart: new Date('2026-07-04T09:40:00.000Z'),
          estimatedWaitTime: 12,
        }),
        // Unknown token types are normalized server-side rather than passed
        // through, so the client's union stays closed.
        makeToken({ id: 'tok-3', tokenType: 'telemedicine' }),
      ];
      const { service } = makeCtx(tokens);
      rows = await service.getQueue('clinic-1');
    });

    it('satisfies the client queue schema for every token shape', () => {
      expect(() => queueListResponseSchema.parse(rows)).not.toThrow();
    });

    it('sends priority as a number, not a string', () => {
      const parsed = queueListResponseSchema.parse(rows);
      expect(parsed[0].priority).toBe(0);
      expect(typeof parsed[0].priority).toBe('number');
    });

    it('sends null appointment/doctor for walk-in tokens', () => {
      const parsed = queueListResponseSchema.parse(rows);
      expect(parsed[1].appointmentId).toBeNull();
      expect(parsed[1].doctorId).toBeNull();
      expect(parsed[1].doctor).toBeNull();
      expect(parsed[1].appointment).toBeNull();
    });

    it('normalizes an unknown tokenType to pending', () => {
      const parsed = queueListResponseSchema.parse(rows);
      expect(parsed[2].tokenType).toBe('pending');
    });

    it('rejects the response when a status leaves the enum', () => {
      const drifted = [
        {
          ...(rows as Record<string, unknown>[])[0],
          status: 'IN_CONSULTATION',
        },
      ];
      expect(() => queueListResponseSchema.parse(drifted)).toThrow();
    });

    it('pins queueTokenStatusSchema to the Prisma enum', () => {
      expect([...queueTokenStatusSchema.options].sort()).toEqual(
        [...Object.values(QueueTokenStatus)].sort(),
      );
    });
  });

  describe('GET /queue/today', () => {
    let payload: unknown;

    beforeEach(async () => {
      const { service } = makeCtx([
        makeToken(),
        makeToken({
          id: 'tok-2',
          appointmentId: null,
          doctorId: null,
          doctor: null,
          appointment: null,
          tokenType: 'walk-in',
          status: 'COMPLETED',
          scheduledTime: null,
          completedAt: new Date('2026-07-04T09:50:00.000Z'),
          consultationStart: new Date('2026-07-04T09:30:00.000Z'),
        }),
      ]);
      payload = await service.getTodayQueue('clinic-1');
    });

    it('satisfies the client today-queue schema', () => {
      expect(() => todayQueueResponseSchema.parse(payload)).not.toThrow();
    });

    it('flattens chiefComplaint and appointmentType onto the entry', () => {
      const parsed = todayQueueResponseSchema.parse(payload);
      expect(parsed.patients[0].chiefComplaint).toBe('Fever');
      expect(parsed.patients[0].appointmentType).toBe('Standard');
    });

    it('derives checkInTime from createdAt rather than leaving it null', () => {
      const parsed = todayQueueResponseSchema.parse(payload);
      expect(parsed.patients[0].checkInTime).toBe(NOW.toISOString());
    });

    it('sends a number tokenNumber, not a nullable one', () => {
      const parsed = todayQueueResponseSchema.parse(payload);
      expect(typeof parsed.patients[0].tokenNumber).toBe('number');
      expect(parsed.patients[1].tokenNumber).toBe(1);
    });

    it('rejects a null tokenNumber at the parse boundary', () => {
      const drifted = structuredClone(payload) as {
        patients: Record<string, unknown>[];
      };
      drifted.patients[0].tokenNumber = null;
      expect(() => todayQueueResponseSchema.parse(drifted)).toThrow();
    });

    it('rejects a null priority at the parse boundary', () => {
      const drifted = structuredClone(payload) as {
        patients: Record<string, unknown>[];
      };
      drifted.patients[0].priority = null;
      expect(() => todayQueueResponseSchema.parse(drifted)).toThrow();
    });

    it('labels walk-in tokens with type "queue"', () => {
      const parsed = todayQueueResponseSchema.parse(payload);
      expect(parsed.patients[1].type).toBe('queue');
      expect(parsed.patients[0].type).toBe('appointment');
    });

    it('reports the day rollup the dashboard counters read', () => {
      const parsed = todayQueueResponseSchema.parse(payload);
      expect(parsed.stats).toMatchObject({
        total: 2,
        waiting: 1,
        pending: 1,
        inProgress: 0,
        completed: 1,
        walkIns: 1,
        scheduled: 1,
      });
    });

    it('rejects the response when stats drift', () => {
      const drifted = structuredClone(payload) as {
        stats: Record<string, unknown>;
      };
      drifted.stats.inProgress = '1';
      expect(() => todayQueueResponseSchema.parse(drifted)).toThrow();
    });
  });
});
