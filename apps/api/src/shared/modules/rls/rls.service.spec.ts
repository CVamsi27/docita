import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { RlsService } from './rls.service';
import { activeTxStorage } from './active-tx.storage';
import type { PrismaService } from '@/prisma/prisma.service';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface FakeTx {
  $executeRaw: jest.Mock;
}

const buildPrisma = (): {
  prisma: PrismaService;
  tx: FakeTx;
  $transaction: jest.Mock;
} => {
  const tx: FakeTx = {
    $executeRaw: jest.fn(async () => 0),
  };
  const $transaction = jest.fn(async (...args: unknown[]) => {
    const fn = args[0] as (tx: FakeTx) => Promise<unknown>;
    return fn(tx);
  });
  return {
    prisma: { $transaction } as unknown as PrismaService,
    tx,
    $transaction,
  };
};

const buildConfig = (rlsEnabled: boolean): AppConfigService =>
  ({
    isRlsEnabled: () => rlsEnabled,
  }) as unknown as AppConfigService;

describe('RlsService', () => {
  let prismaSetup: ReturnType<typeof buildPrisma>;

  beforeEach(() => {
    prismaSetup = buildPrisma();
  });

  it('skips the SET LOCAL handshake while RLS is disabled', async () => {
    const service = new RlsService(prismaSetup.prisma, buildConfig(false));
    const result = await service.runScopedTransaction(
      'clinic-1',
      async () => 'ok',
    );
    expect(result).toBe('ok');
    expect(prismaSetup.tx.$executeRaw).not.toHaveBeenCalled();
    expect(prismaSetup.$transaction).toHaveBeenCalledTimes(1);
  });

  it('issues parameterized set_config calls when RLS is enabled', async () => {
    const service = new RlsService(prismaSetup.prisma, buildConfig(true));
    await service.runScopedTransaction('clinic-1', async () => null);
    expect(prismaSetup.tx.$executeRaw).toHaveBeenCalledTimes(2);
    // $executeRaw template literal arrives as (template, ...values).
    // First call: enable RLS (no user input).
    // Second call: bind the clinicId as a parameter — it must NOT
    // appear in the template strings themselves.
    const [secondTemplate, ...secondValues] = prismaSetup.tx.$executeRaw.mock
      .calls[1] as unknown as [TemplateStringsArray, ...unknown[]];
    expect(secondTemplate.join('?')).toContain('set_config');
    expect(secondTemplate.join('?')).toContain('app.current_clinic_id');
    expect(secondTemplate.join('?')).not.toContain('clinic-1');
    expect(secondValues).toEqual(['clinic-1']);
  });

  it('refuses clinicId values that contain SQL-meaningful characters', async () => {
    const service = new RlsService(prismaSetup.prisma, buildConfig(true));
    await expect(
      service.runScopedTransaction("c1'; DROP TABLE users;--", async () => 1),
    ).rejects.toThrow(/Invalid clinicId/);
  });

  it('propagates the inner callback result', async () => {
    const service = new RlsService(prismaSetup.prisma, buildConfig(true));
    const value = await service.runScopedTransaction('clinic-1', async (tx) => {
      expect(tx).toBe(prismaSetup.tx);
      return 42;
    });
    expect(value).toBe(42);
  });

  it('publishes the active tx into AsyncLocalStorage during the callback', async () => {
    const service = new RlsService(prismaSetup.prisma, buildConfig(true));
    let observedInside: unknown = null;
    await service.runScopedTransaction('clinic-1', async () => {
      observedInside = activeTxStorage.getStore()?.tx ?? null;
    });
    expect(observedInside).toBe(prismaSetup.tx);
    // The store is request-scoped; outside the callback it must not leak.
    expect(activeTxStorage.getStore()).toBeUndefined();
  });
});
