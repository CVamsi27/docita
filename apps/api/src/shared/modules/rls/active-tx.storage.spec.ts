import { describe, expect, it } from '@jest/globals';
import type { Prisma } from '@workspace/db';
import { asType } from '@/test-utils';
import {
  activeTxStorage,
  runOutsideActiveTx,
  runWithActiveTx,
} from './active-tx.storage';

describe('runOutsideActiveTx', () => {
  it('keeps the parent transaction while detached work is still pending', async () => {
    const tx = asType<Prisma.TransactionClient>({});
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    await runWithActiveTx(tx, async () => {
      const detached = runOutsideActiveTx(async () => {
        expect(activeTxStorage.getStore()?.tx).toBeNull();
        await pending;
        expect(activeTxStorage.getStore()?.tx).toBeNull();
      });
      const parentTx = activeTxStorage.getStore()?.tx;
      release();
      await detached;
      expect(parentTx).toBe(tx);
      expect(activeTxStorage.getStore()?.tx).toBe(tx);
    });
  });

  it('isolates nested detachment and rejection from the parent branch', async () => {
    const tx = asType<Prisma.TransactionClient>({});
    const failure = new Error('side effect failed');
    let reject: (error: Error) => void = () => undefined;
    const pending = new Promise<void>((_, rejectPromise) => {
      reject = rejectPromise;
    });

    await runWithActiveTx(tx, async () => {
      const detached = runOutsideActiveTx(() =>
        runOutsideActiveTx(async () => {
          expect(activeTxStorage.getStore()?.tx).toBeNull();
          await pending;
        }),
      );
      const assertion = expect(detached).rejects.toBe(failure);
      const parentTx = activeTxStorage.getStore()?.tx;
      reject(failure);
      await assertion;
      expect(parentTx).toBe(tx);
      expect(activeTxStorage.getStore()?.tx).toBe(tx);
    });
  });

  it('runs without mutating storage when no active tx is published', async () => {
    const result = await runOutsideActiveTx(async () => 'ok');
    expect(result).toBe('ok');
    expect(activeTxStorage.getStore()).toBeUndefined();
  });

  it('temporarily clears the active tx so nested Prisma calls bypass routing', async () => {
    const tx = { marker: 'request-tx' } as unknown as Prisma.TransactionClient;
    const observed: Array<string | null> = [];

    await runWithActiveTx(tx, async () => {
      observed.push(activeTxStorage.getStore()?.tx === tx ? 'inside' : 'lost');
      await runOutsideActiveTx(async () => {
        observed.push(
          activeTxStorage.getStore()?.tx === null ? 'outside' : 'still-inside',
        );
        return undefined;
      });
      observed.push(
        activeTxStorage.getStore()?.tx === tx ? 'restored' : 'lost',
      );
    });

    expect(observed).toEqual(['inside', 'outside', 'restored']);
    expect(activeTxStorage.getStore()).toBeUndefined();
  });
});
