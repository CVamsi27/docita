import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { setTimeout } from 'node:timers/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import singleton, { createUtcPoolConfig, PrismaClient } from '@workspace/db';
import { isRecord } from '@workspace/utils';
import { EncryptionService } from '@/shared/common/encryption.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PrismaService } from '@/prisma/prisma.service';
import { closeDatabase, setupTestDatabase } from './setup';

// Schema preparation is unrelated to pool ownership; queries use real Postgres.
jest.mock('child_process', () => ({
  ...jest.requireActual<typeof import('node:child_process')>('child_process'),
  execSync: jest.fn(() => Buffer.alloc(0)),
}));

type PoolLifecycleClient = Pick<PrismaClient, '$queryRaw' | '$disconnect'>;

// Runtime-loaded scripts can use a distinct generated constructor; check consumed methods.
function isPoolLifecycleClient(value: unknown): value is PoolLifecycleClient {
  return (
    isRecord(value) &&
    typeof value.$queryRaw === 'function' &&
    typeof value.$disconnect === 'function'
  );
}

describe('Prisma owned pool lifecycle', () => {
  let observer: Pool;
  let databaseUrl: string;
  const clients = new Set<PoolLifecycleClient>();
  const pools = new Set<Pool>();

  beforeAll(() => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('A dedicated test DATABASE_URL is required');
    databaseUrl = url;
    observer = new Pool(createUtcPoolConfig({ connectionString: url }));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    for (const client of clients) await client.$disconnect();
    for (const pool of pools) if (!pool.ended) await pool.end();
    clients.clear();
    pools.clear();
  });

  afterAll(async () => {
    await observer.end();
  });

  // Prisma's adapter handle is private; inspect it only to clean up a failing test.
  function rememberClient(client: PoolLifecycleClient) {
    clients.add(client);
    const retainedPool: unknown = Reflect.get(client, 'pool');
    if (retainedPool instanceof Pool) pools.add(retainedPool);
    const engine: unknown = Reflect.get(client, '_engineConfig');
    if (isRecord(engine) && engine.adapter instanceof PrismaPg) {
      const externalPool: unknown = Reflect.get(engine.adapter, 'externalPool');
      if (externalPool instanceof Pool) pools.add(externalPool);
    }
    return client;
  }

  function createService() {
    const config = Object.assign(
      Object.create(AppConfigService.prototype) as AppConfigService,
      {
        getDatabaseUrl: () => databaseUrl,
        isProduction: () => false,
      },
    );
    const encryption = Object.create(
      EncryptionService.prototype,
    ) as EncryptionService;
    const service = new PrismaService(encryption, config);
    rememberClient(service);
    service.onModuleInit();
    return service;
  }

  async function backendPid(client: PoolLifecycleClient) {
    const rows = await client.$queryRaw<
      Array<{ pid: number }>
    >`SELECT pg_backend_pid() AS pid`;
    return rows[0].pid;
  }

  async function expectConnectionClosed(pid: number) {
    const deadline = Date.now() + 2_000;
    let count = 0;
    do {
      const result = await observer.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM pg_stat_activity WHERE pid = $1',
        [pid],
      );
      count = result.rows[0].count;
      if (count === 0) return;
      await setTimeout(20);
    } while (Date.now() < deadline);
    expect(count).toBe(0);
  }

  it('closes the primary pool connections and reports zero saturation after terminal shutdown', async () => {
    const service = createService();
    const pid = await backendPid(service);
    expect(service.getPoolSaturation().total).toBeGreaterThan(0);
    await service.onModuleDestroy();
    expect(service.getPoolSaturation().total).toBe(0);
    await expectConnectionClosed(pid);
  });

  it('keeps ordinary disconnect and reconnect tied to the monitored primary pool', async () => {
    const service = createService();
    const pid = await backendPid(service);
    await service.$disconnect();
    await service.$connect();
    expect(await backendPid(service)).toBe(pid);
    expect(service.getPoolSaturation().total).toBe(1);
    await service.onModuleDestroy();
    await expectConnectionClosed(pid);
  });

  it('allows concurrent and repeated terminal shutdown without ending the pool twice', async () => {
    const service = createService();
    const pid = await backendPid(service);
    await Promise.all([service.onModuleDestroy(), service.onModuleDestroy()]);
    await service.onModuleDestroy();
    await expectConnectionClosed(pid);
  });

  it('releases the primary pool and propagates a disconnect failure', async () => {
    const service = createService();
    const pid = await backendPid(service);
    const failure = new Error('Disconnect failed');
    jest.spyOn(service, '$disconnect').mockRejectedValue(failure);
    await expect(service.onModuleDestroy()).rejects.toBe(failure);
    await expectConnectionClosed(pid);
  });

  it('releases the singleton connections on every disconnect and supports reconnect', async () => {
    rememberClient(singleton);
    const firstPid = await backendPid(singleton);
    await singleton.$disconnect();
    await expectConnectionClosed(firstPid);
    const secondPid = await backendPid(singleton);
    expect(secondPid).not.toBe(firstPid);
    await Promise.all([singleton.$disconnect(), singleton.$disconnect()]);
    await expectConnectionClosed(secondPid);
  });

  it('releases each test helper pool after a suite closes its database', async () => {
    for (let suite = 0; suite < 2; suite += 1) {
      const client = rememberClient(setupTestDatabase());
      const pid = await backendPid(client);
      await Promise.all([closeDatabase(), closeDatabase()]);
      await expectConnectionClosed(pid);
    }
  });

  it('releases the DB guardrail script client pool and supports a later reconnect', async () => {
    const loaded: unknown = await import(
      path.resolve(
        __dirname,
        '../../../packages/db/scripts/prisma-script-client',
      )
    );
    if (!isRecord(loaded) || !isPoolLifecycleClient(loaded.default)) {
      throw new Error('DB guardrail client was not loaded');
    }
    const client = rememberClient(loaded.default);
    const firstPid = await backendPid(client);
    await client.$disconnect();
    await expectConnectionClosed(firstPid);
    const secondPid = await backendPid(client);
    expect(secondPid).not.toBe(firstPid);
    await client.$disconnect();
    await expectConnectionClosed(secondPid);
  });
});
