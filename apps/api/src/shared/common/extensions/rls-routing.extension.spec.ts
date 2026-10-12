import { describe, expect, it, jest } from '@jest/globals';
import { routeOperationThroughActiveTx } from './rls-routing.extension';
import {
  activeTxStorage,
  runWithActiveTx,
} from '@/shared/modules/rls/active-tx.storage';
import type { Prisma } from '@workspace/db';
import { asType } from '@/test-utils';

/**
 * Exercises the routing core extracted from the Prisma extension factory:
 *
 *   - no active tx              -> calls `query(args)` once
 *   - active tx present         -> delegates to `tx[model][op](args)`
 *   - nested call inside route  -> tx in storage is null (recursion guard)
 *   - the store is restored after the routed call resolves
 *
 * Calling the exported function directly avoids reaching into Prisma's
 * private extension representation while still exercising the same
 * branches that ship in production.
 */

describe('rls-routing extension', () => {
  const handler = routeOperationThroughActiveTx;

  it('routes overlapping sibling reads through the same transaction', async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tx = asType<Prisma.TransactionClient>({
      patient: {
        findMany: async ({ marker }: { marker: string }) => {
          expect(activeTxStorage.getStore()?.tx).toBeNull();
          if (marker === 'first') await pending;
          return `scoped-${marker}`;
        },
      },
    });

    const results = await runWithActiveTx(tx, async () => {
      const first = handler({
        model: 'Patient',
        operation: 'findMany',
        args: { marker: 'first' },
        query: async () => 'unscoped-first',
      });
      const second = handler({
        model: 'Patient',
        operation: 'findMany',
        args: { marker: 'second' },
        query: async () => 'unscoped-second',
      });
      release();
      return Promise.all([first, second]);
    });

    expect(results).toEqual(['scoped-first', 'scoped-second']);
  });

  it('passes through to the original query when no active tx is set', async () => {
    const args = { where: { id: 'x' } };
    const query = jest
      .fn<(input: unknown) => Promise<unknown>>()
      .mockResolvedValue('ok');

    const result = await handler({
      model: 'Patient',
      operation: 'findUnique',
      args,
      query,
    });

    expect(result).toBe('ok');
    expect(query).toHaveBeenCalledWith(args);
  });

  it('re-routes the operation through the active tx', async () => {
    const txFindUnique = jest
      .fn<(input: unknown) => Promise<unknown>>()
      .mockResolvedValue({ id: 'p-1' });
    const tx = {
      patient: { findUnique: txFindUnique },
    } as unknown as Prisma.TransactionClient;

    const result = await runWithActiveTx(tx, async () =>
      handler({
        model: 'Patient',
        operation: 'findUnique',
        args: { where: { id: 'p-1' } },
        query: jest
          .fn<(input: unknown) => Promise<unknown>>()
          .mockResolvedValue('outer-prisma-result-should-not-be-used'),
      }),
    );

    expect(result).toEqual({ id: 'p-1' });
    expect(txFindUnique).toHaveBeenCalledWith({ where: { id: 'p-1' } });
  });

  it('temporarily nulls the active tx during the routed call so the chain does not recurse', async () => {
    let observedDuring: unknown = 'never-set';
    const txFindMany = jest
      .fn<(input: unknown) => Promise<unknown>>()
      .mockImplementation(async () => {
        observedDuring = activeTxStorage.getStore()?.tx ?? null;
        return [];
      });
    const tx = {
      patient: { findMany: txFindMany },
    } as unknown as Prisma.TransactionClient;

    await runWithActiveTx(tx, async () => {
      // Sanity: the store sees `tx` before the routed call begins.
      expect(activeTxStorage.getStore()?.tx).toBe(tx);

      await handler({
        model: 'Patient',
        operation: 'findMany',
        args: {},
        query: jest.fn<(input: unknown) => Promise<unknown>>(),
      });

      // After the routed call resolves, the active tx is restored so
      // subsequent operations in the same request continue to route.
      expect(activeTxStorage.getStore()?.tx).toBe(tx);
    });

    expect(observedDuring).toBeNull();
  });

  it('restores the active tx even when the routed call throws', async () => {
    const boom = new Error('boom');
    const txFindUnique = jest
      .fn<(input: unknown) => Promise<unknown>>()
      .mockRejectedValue(boom);
    const tx = {
      patient: { findUnique: txFindUnique },
    } as unknown as Prisma.TransactionClient;

    await runWithActiveTx(tx, async () => {
      await expect(
        handler({
          model: 'Patient',
          operation: 'findUnique',
          args: { where: { id: 'p-err' } },
          query: jest.fn<(input: unknown) => Promise<unknown>>(),
        }),
      ).rejects.toBe(boom);
      // The store survives the failed routed call so sibling queries
      // in the same request still benefit from RLS routing.
      expect(activeTxStorage.getStore()?.tx).toBe(tx);
    });
  });

  it('falls back to query when the tx is missing the model/operation', async () => {
    const tx = {} as unknown as Prisma.TransactionClient;
    const query = jest
      .fn<(input: unknown) => Promise<unknown>>()
      .mockResolvedValue('fallback');

    const result = await runWithActiveTx(tx, async () =>
      handler({
        model: 'UnknownModel',
        operation: 'findUnique',
        args: {},
        query,
      }),
    );

    expect(result).toBe('fallback');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
