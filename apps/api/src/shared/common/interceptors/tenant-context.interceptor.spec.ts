import { describe, expect, it, jest } from '@jest/globals';
import { lastValueFrom, of } from 'rxjs';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { activeTxStorage } from '@/shared/modules/rls/active-tx.storage';
import { tenantStorage } from '@/shared/common/middleware/tenant.middleware';
import type { PrismaService } from '@/prisma/prisma.service';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { getRlsRequestTransactionOptions } from '@/shared/common/database-transaction-options';

interface FakeTx {
  $executeRaw: jest.Mock;
}

function buildContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function buildPrisma(): {
  prisma: PrismaService;
  tx: FakeTx;
  $transaction: jest.Mock;
} {
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
}

function buildConfig(rlsEnabled: boolean): AppConfigService {
  return {
    isRlsEnabled: () => rlsEnabled,
  } as unknown as AppConfigService;
}

describe('TenantContextInterceptor', () => {
  it('does not open a tx or publish an active tx when RLS is disabled', async () => {
    const { prisma, $transaction } = buildPrisma();
    const interceptor = new TenantContextInterceptor(
      prisma,
      buildConfig(false),
    );

    const observedTenant: { clinicId?: string } = {};
    let observedActiveTx: unknown = 'never-set';
    const next: CallHandler<string> = {
      handle: () => {
        observedTenant.clinicId = tenantStorage.getStore()?.clinicId;
        observedActiveTx = activeTxStorage.getStore();
        return of('handler-result');
      },
    };

    const result = await lastValueFrom(
      interceptor.intercept(
        buildContext({ id: 'u-1', clinicId: 'clinic-1', role: 'DOCTOR' }),
        next,
      ),
    );

    expect(result).toBe('handler-result');
    expect($transaction).not.toHaveBeenCalled();
    expect(observedTenant.clinicId).toBe('clinic-1');
    expect(observedActiveTx).toBeUndefined();
  });

  it('publishes the request-scoped tx into activeTxStorage when RLS is enabled', async () => {
    const { prisma, tx, $transaction } = buildPrisma();
    const interceptor = new TenantContextInterceptor(prisma, buildConfig(true));

    let observedTxInsideHandler: unknown = null;
    const next: CallHandler<string> = {
      handle: () => {
        observedTxInsideHandler = activeTxStorage.getStore()?.tx ?? null;
        return of('handler-result');
      },
    };

    const result = await lastValueFrom(
      interceptor.intercept(
        buildContext({ id: 'u-1', clinicId: 'clinic-1', role: 'DOCTOR' }),
        next,
      ),
    );

    expect(result).toBe('handler-result');
    expect($transaction).toHaveBeenCalledTimes(1);
    expect($transaction).toHaveBeenCalledWith(
      expect.any(Function),
      getRlsRequestTransactionOptions(),
    );
    // applyRlsScope issues two `set_config` calls.
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(observedTxInsideHandler).toBe(tx);
    // The store does not leak past the request.
    expect(activeTxStorage.getStore()).toBeUndefined();
  });

  it('skips the RLS tx envelope for INTERNAL bypass users', async () => {
    const { prisma, $transaction } = buildPrisma();
    const interceptor = new TenantContextInterceptor(prisma, buildConfig(true));

    let bypassedSeen: boolean | undefined;
    let activeSeen: unknown = 'never-set';
    const next: CallHandler<string> = {
      handle: () => {
        bypassedSeen = tenantStorage.getStore()?.bypassed;
        activeSeen = activeTxStorage.getStore();
        return of('ok');
      },
    };

    await lastValueFrom(
      interceptor.intercept(
        buildContext({ id: 'u-int', clinicId: undefined, role: 'INTERNAL' }),
        next,
      ),
    );

    expect($transaction).not.toHaveBeenCalled();
    expect(bypassedSeen).toBe(true);
    expect(activeSeen).toBeUndefined();
  });

  it('runs unauthenticated requests without any tenant context', async () => {
    const { prisma } = buildPrisma();
    const interceptor = new TenantContextInterceptor(prisma, buildConfig(true));

    let observedTenant: unknown = 'never-set';
    const next: CallHandler<string> = {
      handle: () => {
        observedTenant = tenantStorage.getStore();
        return of('ok');
      },
    };

    await lastValueFrom(interceptor.intercept(buildContext(undefined), next));

    expect(observedTenant).toBeUndefined();
  });
});
