import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { RlsService } from './rls.service';
import type { PrismaService } from '@/prisma/prisma.service';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface FakeTx {
  $executeRawUnsafe: jest.Mock;
}

const buildPrisma = (): {
  prisma: PrismaService;
  tx: FakeTx;
  $transaction: jest.Mock;
} => {
  const tx: FakeTx = {
    $executeRawUnsafe: jest.fn(async () => 0),
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
    expect(prismaSetup.tx.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(prismaSetup.$transaction).toHaveBeenCalledTimes(1);
  });

  it('issues both GUC SET LOCALs when RLS is enabled', async () => {
    const service = new RlsService(prismaSetup.prisma, buildConfig(true));
    await service.runScopedTransaction('clinic-1', async () => null);
    const calls = prismaSetup.tx.$executeRawUnsafe.mock.calls.map(
      (c) => c[0] as string,
    );
    expect(calls).toEqual([
      "SET LOCAL app.rls_enabled = 'on'",
      "SET LOCAL app.current_clinic_id = 'clinic-1'",
    ]);
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
});
