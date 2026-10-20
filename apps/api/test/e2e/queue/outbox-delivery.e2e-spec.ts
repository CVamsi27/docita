import { Logger as NestLogger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { asType } from '@/test-utils';
import { PrismaService } from '@/prisma/prisma.service';
import {
  getCurrentTenant,
  runWithTenant,
} from '@/shared/common/middleware/tenant.middleware';
import { OutboxService } from '@/shared/modules/outbox/outbox.service';
import { OutboxRelayScheduler } from '@/shared/modules/outbox/outbox-relay.scheduler';
import type { Prisma } from '@workspace/db';
import { withAdvisoryLock } from '@/shared/common/utils/postgres-advisory-lock';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { activeTxStorage } from '@/shared/modules/rls/active-tx.storage';
import {
  setupTestDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';

describe('Outbox durable transaction and dispatch (e2e)', () => {
  let prisma: ReturnType<typeof getPrismaInstance>;
  const outbox = new OutboxService(asType<Logger>({ debug: () => undefined }));

  beforeAll(() => {
    setupTestDatabase();
    prisma = getPrismaInstance();
  });
  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany();
    jest
      .spyOn(NestLogger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => closeDatabase());

  const relay = (events: EventEmitter2) =>
    new OutboxRelayScheduler(
      asType<PrismaService>(prisma),
      events,
      asType<AppConfigService>({ isRlsEnabled: () => false }),
    );

  it('opens a fresh RLS-scoped database transaction for each clinic delivery', async () => {
    await prisma.outboxEvent.createMany({
      data: [
        { eventName: 'test.rls', clinicId: 'clinic-1', payload: {} },
        { eventName: 'test.rls', clinicId: 'clinic-2', payload: {} },
      ],
    });
    const events = new EventEmitter2();
    const observed: Array<{ clinic: string; enabled: string }> = [];
    events.on('test.rls', async () => {
      const tx = activeTxStorage.getStore()?.tx;
      if (!tx) {
        observed.push({ clinic: 'missing', enabled: 'missing' });
        return;
      }
      const rows = await tx.$queryRaw<
        Array<{ clinic: string; enabled: string }>
      >`
        SELECT current_setting('app.current_clinic_id', true) AS clinic,
               current_setting('app.rls_enabled', true) AS enabled
      `;
      observed.push(...rows);
    });
    const module = await Test.createTestingModule({
      providers: [
        OutboxRelayScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        {
          provide: AppConfigService,
          useValue: { isRlsEnabled: () => true, isProduction: () => false },
        },
      ],
    }).compile();
    try {
      await module.get(OutboxRelayScheduler).drain();
      expect(
        observed.sort((left, right) => left.clinic.localeCompare(right.clinic)),
      ).toEqual([
        { clinic: 'clinic-1', enabled: 'on' },
        { clinic: 'clinic-2', enabled: 'on' },
      ]);
    } finally {
      await module.close();
    }
  });

  it('leaves excess clinic rows unclaimed instead of exhausting the development RLS pool', async () => {
    await prisma.outboxEvent.createMany({
      data: Array.from({ length: 20 }, (_, index) => ({
        eventName: 'test.pool-budget',
        clinicId: `clinic-${index}`,
        payload: {},
      })),
    });
    const events = new EventEmitter2();
    events.on('test.pool-budget', async () => undefined);
    const module = await Test.createTestingModule({
      providers: [
        OutboxRelayScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        {
          provide: AppConfigService,
          useValue: { isRlsEnabled: () => true, isProduction: () => false },
        },
      ],
    }).compile();
    try {
      await module.get(OutboxRelayScheduler).drain();
      expect(
        await prisma.outboxEvent.count({
          where: { processedAt: { not: null } },
        }),
      ).toBe(3);
      expect(
        await prisma.outboxEvent.count({
          where: { attempts: 0, processedAt: null },
        }),
      ).toBe(17);
    } finally {
      await module.close();
    }
  });

  it('keeps its advisory transaction alive for the requested bounded work', async () => {
    const shortDefaultClient = asType<PrismaService>({
      $transaction: (
        fn: (tx: Prisma.TransactionClient) => Promise<unknown>,
        options?: { timeout?: number; maxWait?: number },
      ) => prisma.$transaction(fn, { timeout: 100, ...options }),
    });
    await expect(
      withAdvisoryLock(
        shortDefaultClient,
        'synthetic-longer-work',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 250));
          return 'completed';
        },
        1_000,
      ),
    ).resolves.toBe('completed');
  });

  it('keeps the surrounding transaction usable after an idempotent duplicate append', async () => {
    await prisma.$transaction(async (tx) => {
      const event = {
        eventName: 'test.outbox',
        clinicId: 'clinic-1',
        payload: { invoiceId: 'invoice-1' },
        idempotencyKey: 'same-logical-event',
      };
      await outbox.append(tx, event);
      await outbox.append(tx, event);
      const rows = await tx.$queryRaw<
        Array<{ value: number }>
      >`SELECT 1 AS value`;
      expect(rows).toEqual([{ value: 1 }]);
    });
    expect(await prisma.outboxEvent.count()).toBe(1);
  });

  it('keeps unkeyed events distinct', async () => {
    await prisma.$transaction(async (tx) => {
      const event = {
        eventName: 'test.outbox',
        clinicId: null,
        payload: { entityId: 'entity-1' },
      };
      await outbox.append(tx, event);
      await outbox.append(tx, event);
    });
    expect(await prisma.outboxEvent.count()).toBe(2);
  });

  it('keeps an event retryable when no subscriber can deliver it', async () => {
    const row = await prisma.outboxEvent.create({
      data: {
        eventName: 'test.unhandled',
        clinicId: 'clinic-1',
        payload: { invoiceId: 'invoice-1' },
      },
    });
    await relay(new EventEmitter2({ wildcard: true })).drain();
    const persisted = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(persisted.processedAt).toBeNull();
    expect(persisted.attempts).toBe(1);
    expect(persisted.nextAttemptAt?.getTime()).toBeGreaterThan(Date.now());
    expect(persisted.lastError).toMatch(/subscriber/i);
  });

  it('isolates concurrent row clinics and does not inherit the caller tenant', async () => {
    await prisma.outboxEvent.createMany({
      data: [
        {
          eventName: 'test.scoped',
          clinicId: 'clinic-1',
          payload: { entityId: 'first' },
        },
        {
          eventName: 'test.scoped',
          clinicId: 'clinic-2',
          payload: { entityId: 'second' },
        },
        {
          eventName: 'test.scoped',
          clinicId: null,
          payload: { entityId: 'global' },
        },
      ],
    });
    const observed: Array<{
      entityId: string;
      before: string | null;
      after: string | null;
    }> = [];
    const events = new EventEmitter2({ wildcard: true });
    events.on('test.scoped', async (payload: { entityId: string }) => {
      const before = getCurrentTenant()?.clinicId ?? null;
      await Promise.resolve();
      observed.push({
        entityId: payload.entityId,
        before,
        after: getCurrentTenant()?.clinicId ?? null,
      });
    });
    await runWithTenant({ clinicId: 'caller-clinic', bypassed: true }, () =>
      relay(events).drain(),
    );
    expect(
      observed.sort((left, right) =>
        left.entityId.localeCompare(right.entityId),
      ),
    ).toEqual([
      { entityId: 'first', before: 'clinic-1', after: 'clinic-1' },
      { entityId: 'global', before: null, after: null },
      { entityId: 'second', before: 'clinic-2', after: 'clinic-2' },
    ]);
    expect(
      await prisma.outboxEvent.count({ where: { processedAt: { not: null } } }),
    ).toBe(3);
  });

  it('rejects a clinic mismatch before invoking subscribers', async () => {
    const row = await prisma.outboxEvent.create({
      data: {
        eventName: 'test.scoped',
        clinicId: 'clinic-1',
        payload: { clinicId: 'clinic-other' },
      },
    });
    const events = new EventEmitter2();
    const subscriber = jest.fn();
    events.on('test.scoped', subscriber);
    await relay(events).drain();
    expect(subscriber).not.toHaveBeenCalled();
    const persisted = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(persisted.processedAt).toBeNull();
    expect(persisted.lastError).toMatch(/clinic/i);
  });
});
