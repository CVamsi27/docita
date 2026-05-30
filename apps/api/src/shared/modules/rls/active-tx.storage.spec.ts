import { describe, expect, it } from '@jest/globals';
import type { Prisma } from '@workspace/db';
import {
  activeTxStorage,
  runOutsideActiveTx,
  runWithActiveTx,
} from './active-tx.storage';

describe('runOutsideActiveTx', () => {
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
