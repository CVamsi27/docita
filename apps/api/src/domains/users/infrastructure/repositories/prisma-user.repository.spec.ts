import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PrismaUserRepository } from './prisma-user.repository';

function makeCtx() {
  const user = {
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    update: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const dataSubjectRequest = {
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const prisma = {
    user,
    dataSubjectRequest,
    // runUnrestricted just runs the callback in a tenant-bypass context.
    runUnrestricted: <T>(cb: () => Promise<T>) => cb(),
  } as never;
  const clock = { now: () => new Date('2026-07-02T00:00:00Z') } as never;
  return {
    repo: new PrismaUserRepository(prisma, clock),
    user,
    dataSubjectRequest,
  };
}

describe('PrismaUserRepository.recordAccountDeletionRequest', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('soft-deletes, disables login, and creates a DataSubjectRequest for clinic staff', async () => {
    ctx.user.findUnique.mockResolvedValue({
      id: 'u1',
      name: 'Dr A',
      clinicId: 'c1',
      deletedAt: null,
    });
    ctx.dataSubjectRequest.create.mockResolvedValue({ id: 'dsr1' });

    const result = await ctx.repo.recordAccountDeletionRequest('u1');

    expect(result).toEqual({
      requestId: 'dsr1',
      requestedAt: new Date('2026-07-02T00:00:00Z'),
    });
    // Soft delete + login disabled.
    const updateData = (
      ctx.user.update.mock.calls[0][0] as {
        data: { deletedAt: Date; appLoginDisabled: boolean };
      }
    ).data;
    expect(updateData.appLoginDisabled).toBe(true);
    expect(updateData.deletedAt).toEqual(new Date('2026-07-02T00:00:00Z'));
    // Tracked deletion request with a 30-day SLA.
    const dsrData = (
      ctx.dataSubjectRequest.create.mock.calls[0][0] as {
        data: { requestType: string; clinicId: string; dueAt: Date };
      }
    ).data;
    expect(dsrData.requestType).toBe('DELETION');
    expect(dsrData.clinicId).toBe('c1');
    expect(dsrData.dueAt).toEqual(new Date('2026-08-01T00:00:00Z'));
  });

  it('preserves an earlier deletedAt when the request is repeated', async () => {
    const earlier = new Date('2026-06-01T00:00:00Z');
    ctx.user.findUnique.mockResolvedValue({
      id: 'u1',
      name: 'Dr A',
      clinicId: 'c1',
      deletedAt: earlier,
    });
    ctx.dataSubjectRequest.create.mockResolvedValue({ id: 'dsr2' });

    await ctx.repo.recordAccountDeletionRequest('u1');

    const updateData = (
      ctx.user.update.mock.calls[0][0] as {
        data: { deletedAt: Date };
      }
    ).data;
    expect(updateData.deletedAt).toBe(earlier);
  });

  it('skips the DataSubjectRequest for a user with no clinic (platform/internal)', async () => {
    ctx.user.findUnique.mockResolvedValue({
      id: 'u1',
      name: 'Ops',
      clinicId: null,
      deletedAt: null,
    });

    const result = await ctx.repo.recordAccountDeletionRequest('u1');

    expect(result.requestId).toBeNull();
    expect(ctx.dataSubjectRequest.create).not.toHaveBeenCalled();
    expect(ctx.user.update).toHaveBeenCalledTimes(1);
  });

  it('throws NotFound when the user does not exist', async () => {
    ctx.user.findUnique.mockResolvedValue(null);

    await expect(
      ctx.repo.recordAccountDeletionRequest('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.user.update).not.toHaveBeenCalled();
  });
});
