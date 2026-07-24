import { NotFoundException } from '@nestjs/common';
import { loadSubscriptionByIdOrThrow } from './subscription-lifecycle.helpers';

function createMockRepo(subscription: unknown = null) {
  return {
    findById: jest.fn().mockResolvedValue(subscription),
  } as any;
}

describe('loadSubscriptionByIdOrThrow', () => {
  it('returns subscription when found', async () => {
    const subscription = { id: 'sub-1', status: 'ACTIVE' };
    const repo = createMockRepo(subscription);
    const result = await loadSubscriptionByIdOrThrow(repo, 'sub-1');
    expect(result).toBe(subscription);
    expect(repo.findById).toHaveBeenCalledWith('sub-1');
  });

  it('throws NotFoundException when subscription is null', async () => {
    const repo = createMockRepo(null);
    await expect(loadSubscriptionByIdOrThrow(repo, 'sub-999')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when subscription is undefined', async () => {
    const repo = createMockRepo(undefined);
    await expect(loadSubscriptionByIdOrThrow(repo, 'sub-999')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws with correct message', async () => {
    const repo = createMockRepo(null);
    try {
      await loadSubscriptionByIdOrThrow(repo, 'sub-42');
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(
        'Subscription sub-42 not found',
      );
    }
  });

  it('calls findById with the correct id', async () => {
    const repo = createMockRepo({ id: 'sub-7' });
    await loadSubscriptionByIdOrThrow(repo, 'sub-7');
    expect(repo.findById).toHaveBeenCalledTimes(1);
    expect(repo.findById).toHaveBeenCalledWith('sub-7');
  });

  it('returns falsy subscription values that are not null/undefined', async () => {
    const subscription = { id: 'sub-0', status: '' };
    const repo = createMockRepo(subscription);
    const result = await loadSubscriptionByIdOrThrow(repo, 'sub-0');
    expect(result).toBe(subscription);
  });
});
