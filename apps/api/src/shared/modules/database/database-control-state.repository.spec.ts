import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Prisma } from '@workspace/db';
import { DatabaseControlStateRepository } from './database-control-state.repository';

describe('DatabaseControlStateRepository', () => {
  let repository: DatabaseControlStateRepository;
  let prisma: {
    databaseControlAction: {
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let clock: { now: jest.Mock };

  beforeEach(() => {
    prisma = {
      databaseControlAction: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    clock = { now: jest.fn(() => new Date('2026-08-10T00:00:00Z')) };
    repository = new DatabaseControlStateRepository(prisma as never, clock as never);
  });

  it('recordStart inserts an IN_PROGRESS row and returns the generated id', async () => {
    prisma.databaseControlAction.create.mockResolvedValueOnce({ id: 'action-1' });

    const id = await repository.recordStart({
      action: 'STOP',
      reason: 'cost saving',
      actorUserId: 'user-1',
      actorEmail: 'ops@example.com',
    });

    expect(id).toBe('action-1');
    expect(prisma.databaseControlAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'STOP',
          status: 'IN_PROGRESS',
          reason: 'cost saving',
          actorUserId: 'user-1',
          actorEmail: 'ops@example.com',
          startedAt: clock.now(),
        }),
      }),
    );
  });

  it('recordCompletion writes status + awsRequestId + completedAt + metadata', async () => {
    prisma.databaseControlAction.update.mockResolvedValueOnce({});

    await repository.recordCompletion('action-1', {
      id: 'action-1',
      status: 'SUCCESS',
      awsRequestId: 'aws-req-1',
      completedAt: new Date('2026-08-10T00:01:00Z'),
      metadata: { finalSnapshotId: 'snap-1' },
    });

    expect(prisma.databaseControlAction.update).toHaveBeenCalledWith({
      where: { id: 'action-1' },
      data: {
        status: 'SUCCESS',
        awsRequestId: 'aws-req-1',
        errorMessage: null,
        completedAt: new Date('2026-08-10T00:01:00Z'),
        metadata: { finalSnapshotId: 'snap-1' },
      },
    });
  });

  it('recordCompletion sets metadata to JsonNull when omitted', async () => {
    prisma.databaseControlAction.update.mockResolvedValueOnce({});

    await repository.recordCompletion('action-1', {
      id: 'action-1',
      status: 'SUCCESS',
      completedAt: new Date('2026-08-10T00:01:00Z'),
    });

    expect(prisma.databaseControlAction.update).toHaveBeenCalledWith({
      where: { id: 'action-1' },
      data: expect.objectContaining({ metadata: Prisma.JsonNull }),
    });
  });

  it('recordBackgroundCompletion persists the FAILED outcome for the long-running wait chain', async () => {
    prisma.databaseControlAction.update.mockResolvedValueOnce({});

    await repository.recordBackgroundCompletion('action-1', {
      status: 'FAILED',
      errorMessage: 'rds waitForStopped timed out after 5m',
      completedAt: new Date('2026-08-10T00:05:00Z'),
    });

    expect(prisma.databaseControlAction.update).toHaveBeenCalledWith({
      where: { id: 'action-1' },
      data: {
        status: 'FAILED',
        errorMessage: 'rds waitForStopped timed out after 5m',
        completedAt: new Date('2026-08-10T00:05:00Z'),
      },
    });
  });

  it('recordBackgroundCompletion swallows P2025 (row was deleted between start and background wait)', async () => {
    const p2025 = Object.assign(new Error('Record to update not found'), {
      code: 'P2025',
    });
    prisma.databaseControlAction.update.mockRejectedValueOnce(p2025);

    // Should not throw — the background wait chain must not surface a
    // "row missing" error to the unhandled-rejection handler.
    await expect(
      repository.recordBackgroundCompletion('deleted-action', {
        status: 'FAILED',
        errorMessage: 'irrelevant',
        completedAt: clock.now(),
      }),
    ).resolves.toBeUndefined();
  });

  it('recordBackgroundCompletion rethrows non-P2025 errors so genuine failures are not swallowed', async () => {
    prisma.databaseControlAction.update.mockRejectedValueOnce(
      new Error('connection refused'),
    );

    await expect(
      repository.recordBackgroundCompletion('action-1', {
        status: 'FAILED',
        errorMessage: 'x',
        completedAt: clock.now(),
      }),
    ).rejects.toThrow('connection refused');
  });

  it('findLastActionTimestamp returns the most recent IN_PROGRESS or SUCCESS row', async () => {
    prisma.databaseControlAction.findFirst.mockResolvedValueOnce({
      startedAt: new Date('2026-08-09T12:00:00Z'),
    });

    const ts = await repository.findLastActionTimestamp('STOP');

    expect(ts).toEqual(new Date('2026-08-09T12:00:00Z'));
    expect(prisma.databaseControlAction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: 'STOP',
          status: { in: ['IN_PROGRESS', 'SUCCESS'] },
        }),
        orderBy: { startedAt: 'desc' },
      }),
    );
  });

  it('findLastActionTimestamp returns null when there is no prior action', async () => {
    prisma.databaseControlAction.findFirst.mockResolvedValueOnce(null);

    const ts = await repository.findLastActionTimestamp('RESTORE');

    expect(ts).toBeNull();
  });

  it('findRecentHistory caps the page at the requested limit', async () => {
    prisma.databaseControlAction.findMany.mockResolvedValueOnce([]);

    await repository.findRecentHistory(7);

    expect(prisma.databaseControlAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 7 }),
    );
  });
});
