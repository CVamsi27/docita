import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InternalServerErrorException } from '@nestjs/common';
import { InternalLogService } from './internal-log.service';

describe('InternalLogService', () => {
  let service: InternalLogService;
  let storageQuery: {
    queryStoredLogs: jest.Mock<
      (args1: unknown, args2: unknown, args3: unknown) => Promise<unknown>
    >;
  };
  let activityFallback: {
    queryRecentActivityLogs: jest.Mock<
      (args1: unknown, args2: unknown, args3: unknown) => Promise<unknown>
    >;
  };

  beforeEach(() => {
    storageQuery = { queryStoredLogs: jest.fn() };
    activityFallback = { queryRecentActivityLogs: jest.fn() };
    service = new InternalLogService(
      storageQuery as never,
      activityFallback as never,
    );
  });

  it('returns stored logs when the storage query has rows', async () => {
    const stored = { data: [{ id: 'log-1' }], total: 1 };
    storageQuery.queryStoredLogs.mockResolvedValueOnce(stored);

    const result = await service.getLogs(10, 0, {});

    expect(result).toEqual(stored);
    expect(activityFallback.queryRecentActivityLogs).not.toHaveBeenCalled();
  });

  it('falls back to the activity log query when storage returns no rows', async () => {
    storageQuery.queryStoredLogs.mockResolvedValueOnce({ data: [], total: 0 });
    activityFallback.queryRecentActivityLogs.mockResolvedValueOnce({
      data: [{ id: 'fallback-1' }],
      total: 1,
    });

    const result = await service.getLogs(10, 0, {});

    expect(result.data[0]?.id).toBe('fallback-1');
    expect(activityFallback.queryRecentActivityLogs).toHaveBeenCalledWith(
      10,
      0,
      {},
    );
  });

  it('clamps the limit to the [1, 100] range to prevent unbounded fetches', async () => {
    storageQuery.queryStoredLogs.mockResolvedValue({ data: [], total: 0 });
    activityFallback.queryRecentActivityLogs.mockResolvedValue({
      data: [],
      total: 0,
    });

    await service.getLogs(0, -5, {});
    // limit 0 → clamped to 1
    expect(storageQuery.queryStoredLogs).toHaveBeenCalledWith(1, 0, {});

    await service.getLogs(1000, 50, {});
    // limit 1000 → clamped to 100
    expect(storageQuery.queryStoredLogs).toHaveBeenLastCalledWith(100, 50, {});
  });

  it('falls back to defaults when the limit and offset are not finite numbers', async () => {
    storageQuery.queryStoredLogs.mockResolvedValue({ data: [], total: 0 });
    activityFallback.queryRecentActivityLogs.mockResolvedValue({
      data: [],
      total: 0,
    });

    await service.getLogs(Number.NaN as never, Number.NaN as never, {});
    expect(storageQuery.queryStoredLogs).toHaveBeenCalledWith(50, 0, {});
  });

  it('wraps storage errors as InternalServerErrorException so callers see a clean 500', async () => {
    storageQuery.queryStoredLogs.mockRejectedValueOnce(new Error('db down'));

    await expect(service.getLogs(10, 0, {})).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
