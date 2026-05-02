import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { IdempotencyService } from './idempotency.service';
import type { IdempotencyRepository } from './idempotency.repository';
import { IDEMPOTENCY_TTL_SECONDS_DEFAULT } from './idempotency.constants';

function buildRepositoryMock(): jest.Mocked<
  Pick<
    IdempotencyRepository,
    | 'findActiveCompleted'
    | 'isKeyProcessing'
    | 'markProcessing'
    | 'completeProcessing'
    | 'abortProcessing'
  >
> {
  return {
    findActiveCompleted: jest.fn(),
    isKeyProcessing: jest.fn(),
    markProcessing: jest.fn(),
    completeProcessing: jest.fn(),
    abortProcessing: jest.fn(),
  };
}

describe('IdempotencyService', () => {
  let repository: ReturnType<typeof buildRepositoryMock>;
  let service: IdempotencyService;

  beforeEach(() => {
    repository = buildRepositoryMock();
    service = new IdempotencyService(
      repository as unknown as IdempotencyRepository,
    );
  });

  describe('buildKey', () => {
    it('scopes by tenant, user, method, path, and key so identical UUIDs do not collide across scopes', () => {
      const a = service.buildKey({
        tenantId: 't1',
        userId: 'u1',
        method: 'POST',
        path: '/api/v1/appointments',
        key: 'abc',
      });
      const b = service.buildKey({
        tenantId: 't2',
        userId: 'u1',
        method: 'POST',
        path: '/api/v1/appointments',
        key: 'abc',
      });
      const c = service.buildKey({
        tenantId: 't1',
        userId: 'u2',
        method: 'POST',
        path: '/api/v1/appointments',
        key: 'abc',
      });
      const d = service.buildKey({
        tenantId: 't1',
        userId: 'u1',
        method: 'POST',
        path: '/api/v1/patients',
        key: 'abc',
      });

      expect(new Set([a, b, c, d]).size).toBe(4);
    });

    it('upper-cases the method so GET vs get share a scope', () => {
      const a = service.buildKey({
        tenantId: 't',
        userId: 'u',
        method: 'post',
        path: '/x',
        key: 'k',
      });
      const b = service.buildKey({
        tenantId: 't',
        userId: 'u',
        method: 'POST',
        path: '/x',
        key: 'k',
      });
      expect(a).toBe(b);
    });
  });

  describe('hashBody', () => {
    it('produces the same digest regardless of object key order', () => {
      const a = service.hashBody({ a: 1, b: 2, c: { d: 3, e: 4 } });
      const b = service.hashBody({ b: 2, a: 1, c: { e: 4, d: 3 } });
      expect(a).toBe(b);
    });

    it('produces a different digest when the body actually changes', () => {
      const a = service.hashBody({ amount: 100 });
      const b = service.hashBody({ amount: 200 });
      expect(a).not.toBe(b);
    });

    it('treats null and undefined as the same canonical empty body', () => {
      expect(service.hashBody(null)).toBe(service.hashBody(undefined));
    });

    it('preserves array order (since arrays are inherently ordered)', () => {
      const a = service.hashBody({ items: [1, 2, 3] });
      const b = service.hashBody({ items: [3, 2, 1] });
      expect(a).not.toBe(b);
    });
  });

  describe('persistence delegation', () => {
    it('round-trips an entry through getCached/saveCached', async () => {
      const key = service.buildKey({
        tenantId: 't',
        userId: 'u',
        method: 'POST',
        path: '/x',
        key: 'k',
      });
      repository.findActiveCompleted.mockResolvedValueOnce({
        bodyHash: 'h',
        response: { id: 'a' },
        createdAt: 1,
      });
      const cached = await service.getCached(key);
      expect(cached).toEqual({
        bodyHash: 'h',
        response: { id: 'a' },
        createdAt: 1,
      });

      await service.saveCached(key, {
        bodyHash: 'h2',
        response: { id: 'b' },
        createdAt: 2,
      });
      expect(repository.completeProcessing).toHaveBeenCalledWith(
        key,
        'h2',
        { id: 'b' },
        IDEMPOTENCY_TTL_SECONDS_DEFAULT,
      );
    });

    it('returns null when the repository has no active completed row', async () => {
      repository.findActiveCompleted.mockResolvedValue(null);
      const cached = await service.getCached('nope');
      expect(cached).toBeNull();
    });

    it('marks and clears the in-flight processing flag via the repository', async () => {
      const key = 'pkey';
      repository.isKeyProcessing
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      repository.markProcessing.mockResolvedValue();
      repository.abortProcessing.mockResolvedValue();

      expect(await service.isProcessing(key)).toBe(false);
      await service.markProcessing(key);
      expect(repository.markProcessing).toHaveBeenCalledWith(key);
      expect(await service.isProcessing(key)).toBe(true);
      await service.clearProcessing(key);
      expect(repository.abortProcessing).toHaveBeenCalledWith(key);
    });
  });
});
