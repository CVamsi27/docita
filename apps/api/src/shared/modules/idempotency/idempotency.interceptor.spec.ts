import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, lastValueFrom, of } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_METADATA_KEY,
} from './idempotency.constants';
import type { RequiresIdempotencyMetadata } from './requires-idempotency.decorator';

const VALID_KEY = '550e8400-e29b-41d4-a716-446655440000';

function buildContext(opts: {
  metadata?: RequiresIdempotencyMetadata | null;
  request: Record<string, unknown>;
}): { ctx: ExecutionContext; reflector: Reflector } {
  const reflector = {
    get: jest.fn((key: unknown) => {
      if (key === IDEMPOTENCY_METADATA_KEY) return opts.metadata ?? undefined;
      return undefined;
    }),
  } as unknown as Reflector;
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => opts.request,
    }),
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
  return { ctx, reflector };
}

function buildHandler<T>(value: T): CallHandler<T> {
  return { handle: () => of(value) } as CallHandler<T>;
}

interface ScopeArg {
  tenantId: string;
  userId: string;
  method: string;
  path: string;
  key: string;
}

function buildService(): IdempotencyService {
  const map = new Map<string, unknown>();
  return {
    buildKey: (s: ScopeArg) =>
      `idempotency:v2:${s.tenantId}:${s.userId}:${s.method}:${s.path}:${s.key}`,
    hashBody: (b: unknown) => JSON.stringify(b ?? null),
    getCached: async (k: string) =>
      (map.get(k) ?? null) as Awaited<
        ReturnType<IdempotencyService['getCached']>
      >,
    saveCached: async (k: string, v: unknown) => {
      map.set(k, v);
    },
    isProcessing: async (k: string) => map.has(`${k}:processing`),
    markProcessing: async (k: string) => {
      if (map.has(`${k}:processing`)) {
        throw new ConflictException(
          'A request with this Idempotency-Key is already in progress.',
        );
      }
      map.set(`${k}:processing`, true);
    },
    clearProcessing: async (k: string) => {
      map.delete(`${k}:processing`);
    },
  } as unknown as IdempotencyService;
}

describe('IdempotencyInterceptor', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    service = buildService();
  });

  it('passes through unmarked endpoints', async () => {
    const { ctx, reflector } = buildContext({
      metadata: null,
      request: { method: 'POST', headers: {}, path: '/x', user: {} },
    });
    const interceptor = new IdempotencyInterceptor(reflector, service);
    const handler = buildHandler('original');

    const obs = await interceptor.intercept(ctx, handler);
    expect(await firstValueFrom(obs)).toBe('original');
  });

  it('passes through when the header is absent on a marked endpoint', async () => {
    const { ctx, reflector } = buildContext({
      metadata: { ttl: 60 },
      request: {
        method: 'POST',
        headers: {},
        path: '/x',
        user: { id: 'u', clinicId: 't' },
      },
    });
    const interceptor = new IdempotencyInterceptor(reflector, service);
    const handler = buildHandler('original');

    const obs = await interceptor.intercept(ctx, handler);
    expect(await firstValueFrom(obs)).toBe('original');
  });

  it('rejects a malformed (non-UUIDv4) key with 400', async () => {
    const { ctx, reflector } = buildContext({
      metadata: { ttl: 60 },
      request: {
        method: 'POST',
        headers: { [IDEMPOTENCY_HEADER]: 'not-a-uuid' },
        path: '/x',
        user: { id: 'u', clinicId: 't' },
      },
    });
    const interceptor = new IdempotencyInterceptor(reflector, service);
    const handler = buildHandler('original');

    await expect(interceptor.intercept(ctx, handler)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when the request has no tenant scope (defense in depth)', async () => {
    const { ctx, reflector } = buildContext({
      metadata: { ttl: 60 },
      request: {
        method: 'POST',
        headers: { [IDEMPOTENCY_HEADER]: VALID_KEY },
        path: '/x',
        user: {},
      },
    });
    const interceptor = new IdempotencyInterceptor(reflector, service);
    const handler = buildHandler('original');

    await expect(interceptor.intercept(ctx, handler)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns the cached response when the same key + same body is replayed', async () => {
    const reqBase = {
      method: 'POST',
      headers: { [IDEMPOTENCY_HEADER]: VALID_KEY },
      path: '/x',
      user: { id: 'u', clinicId: 't' },
      body: { foo: 1 },
    };
    const interceptor = new IdempotencyInterceptor(
      buildContext({ metadata: { ttl: 60 }, request: reqBase }).reflector,
      service,
    );

    const first = buildContext({ metadata: { ttl: 60 }, request: reqBase });
    const obs1 = await new IdempotencyInterceptor(
      first.reflector,
      service,
    ).intercept(first.ctx, buildHandler({ id: 'created-1' }));
    const collected1 = await lastValueFrom(obs1.pipe(toArray()));

    const second = buildContext({ metadata: { ttl: 60 }, request: reqBase });
    const obs2 = await new IdempotencyInterceptor(
      second.reflector,
      service,
    ).intercept(second.ctx, buildHandler({ id: 'created-2' }));
    const collected2 = await lastValueFrom(obs2.pipe(toArray()));

    void interceptor;
    expect(collected1).toEqual([{ id: 'created-1' }]);
    expect(collected2).toEqual([{ id: 'created-1' }]);
  });

  it('returns 422 when the same key is replayed with a different body', async () => {
    const baseReq = {
      method: 'POST',
      headers: { [IDEMPOTENCY_HEADER]: VALID_KEY },
      path: '/x',
      user: { id: 'u', clinicId: 't' },
    };
    const first = buildContext({
      metadata: { ttl: 60 },
      request: { ...baseReq, body: { foo: 1 } },
    });
    const obs = await new IdempotencyInterceptor(
      first.reflector,
      service,
    ).intercept(first.ctx, buildHandler({ id: 'created' }));
    await lastValueFrom(obs.pipe(toArray()));

    const second = buildContext({
      metadata: { ttl: 60 },
      request: { ...baseReq, body: { foo: 2 } },
    });
    await expect(
      new IdempotencyInterceptor(second.reflector, service).intercept(
        second.ctx,
        buildHandler({ id: 'never' }),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('returns 409 when the same key is in-flight (processing flag set)', async () => {
    const req = {
      method: 'POST',
      headers: { [IDEMPOTENCY_HEADER]: VALID_KEY },
      path: '/x',
      user: { id: 'u', clinicId: 't' },
      body: { foo: 1 },
    };

    await service.markProcessing(
      service.buildKey({
        tenantId: 't',
        userId: 'u',
        method: 'POST',
        path: '/x',
        key: VALID_KEY,
      }),
    );

    const { ctx, reflector } = buildContext({
      metadata: { ttl: 60 },
      request: req,
    });
    await expect(
      new IdempotencyInterceptor(reflector, service).intercept(
        ctx,
        buildHandler('x'),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('clears the processing flag after a successful response so retries see the cache', async () => {
    const req = {
      method: 'POST',
      headers: { [IDEMPOTENCY_HEADER]: VALID_KEY },
      path: '/x',
      user: { id: 'u', clinicId: 't' },
      body: { foo: 1 },
    };

    const { ctx, reflector } = buildContext({
      metadata: { ttl: 60 },
      request: req,
    });
    const obs = await new IdempotencyInterceptor(reflector, service).intercept(
      ctx,
      buildHandler({ id: 'ok' }),
    );
    await lastValueFrom(obs.pipe(toArray()));

    expect(
      await service.isProcessing(
        service.buildKey({
          tenantId: 't',
          userId: 'u',
          method: 'POST',
          path: '/x',
          key: VALID_KEY,
        }),
      ),
    ).toBe(false);
  });
});
