import { describe, expect, it, beforeEach } from '@jest/globals';
import { IdempotencyService } from './idempotency.service';
import type { Cache } from 'cache-manager';

function buildMemoryCache(): Cache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    get: async (key: string) => {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set: async (key: string, value: unknown, ttlMs?: number) => {
      store.set(key, {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : 0,
      });
    },
    del: async (key: string) => {
      store.delete(key);
    },
    reset: async () => {
      store.clear();
    },
  } as unknown as Cache;
}

describe('IdempotencyService', () => {
  let cache: Cache;
  let service: IdempotencyService;

  beforeEach(() => {
    cache = buildMemoryCache();
    service = new IdempotencyService(cache);
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

  describe('cache lifecycle', () => {
    it('round-trips an entry through getCached/saveCached', async () => {
      const key = service.buildKey({
        tenantId: 't',
        userId: 'u',
        method: 'POST',
        path: '/x',
        key: 'k',
      });
      await service.saveCached(key, {
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
    });

    it('returns null for an unknown key', async () => {
      const cached = await service.getCached('nope');
      expect(cached).toBeNull();
    });

    it('returns null for a malformed cached entry (defensive)', async () => {
      await cache.set('weird', 'not-an-object', 60_000);
      const cached = await service.getCached('weird');
      expect(cached).toBeNull();
    });

    it('marks and clears the in-flight processing flag', async () => {
      const key = 'pkey';
      expect(await service.isProcessing(key)).toBe(false);
      await service.markProcessing(key);
      expect(await service.isProcessing(key)).toBe(true);
      await service.clearProcessing(key);
      expect(await service.isProcessing(key)).toBe(false);
    });
  });
});
