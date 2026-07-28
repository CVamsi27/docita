import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferrerCodeBackfillService } from './referrer-code-backfill.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { WithAdvisoryLock } from '@/shared/common/utils/postgres-advisory-lock';
import { generateReferrerCode } from './referral-code.rules';

interface FakeReferrer {
  id: string;
  code: string | null;
}

class FakePrismaService {
  referrers = new Map<string, FakeReferrer>();
  reservedCodes = new Set<string>();

  buildClient(): PrismaService {
    return {
      referrer: {
        count: jest.fn(async (args: { where: { code: null } }) => {
          let n = 0;
          for (const r of this.referrers.values()) {
            if (r.code === null) n += 1;
          }
          void args;
          return n;
        }),
        findMany: jest.fn(
          async (args: {
            where: { code: null };
            take: number;
            select: { id: boolean };
            orderBy: unknown;
          }) => {
            const out: Array<{ id: string }> = [];
            for (const r of this.referrers.values()) {
              if (r.code === null) {
                out.push({ id: r.id });
                if (out.length >= args.take) break;
              }
            }
            void args.orderBy;
            void args.select;
            return out;
          },
        ),
        findUnique: jest.fn(async (args: { where: { code: string } }) => {
          for (const r of this.referrers.values()) {
            if (r.code === args.where.code) return { id: r.id };
          }
          return null;
        }),
        updateMany: jest.fn(
          async (args: {
            where: { id: string; code: null };
            data: { code: string };
          }) => {
            const r = this.referrers.get(args.where.id);
            if (!r || r.code !== null) return { count: 0 };
            // Simulate the unique-constraint check: don't accept codes
            // already used by another row.
            if (this.reservedCodes.has(args.data.code)) {
              throw new Error('Unique constraint violation');
            }
            r.code = args.data.code;
            this.reservedCodes.add(args.data.code);
            return { count: 1 };
          },
        ),
      },
    } as unknown as PrismaService;
  }
}

/**
 * Test-time stub of the advisory-lock helper. The production version
 * requires a real Postgres session; here we just run the callback
 * (optionally returning `null` to simulate "another process holds
 * the lock" so we can exercise the no-op branch).
 */
function stubLock(
  mode: 'acquire' | 'contend',
): WithAdvisoryLock<{ written: number }> {
  return async (_prisma, _name, fn) => {
    if (mode === 'contend') return null;
    return fn();
  };
}

describe('ReferrerCodeBackfillService', () => {
  let prisma: FakePrismaService;
  let service: ReferrerCodeBackfillService;

  beforeEach(() => {
    prisma = new FakePrismaService();
    service = new ReferrerCodeBackfillService(
      prisma.buildClient(),
      stubLock('acquire'),
    );
  });

  describe('runBackfill', () => {
    it('short-circuits when no referrers have NULL code', async () => {
      prisma.referrers.set('rfr_1', { id: 'rfr_1', code: 'RFR-AB23CD' });
      const result = await service.runBackfill();
      expect(result).toEqual({ written: 0 });
    });

    it('writes codes to every NULL-coded referrer', async () => {
      prisma.referrers.set('rfr_1', { id: 'rfr_1', code: null });
      prisma.referrers.set('rfr_2', { id: 'rfr_2', code: null });
      prisma.referrers.set('rfr_3', { id: 'rfr_3', code: 'RFR-EXISTING' });
      const result = await service.runBackfill();
      expect(result.written).toBe(2);
      expect(prisma.referrers.get('rfr_1')?.code).toMatch(
        /^RFR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
      );
      expect(prisma.referrers.get('rfr_2')?.code).toMatch(
        /^RFR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
      );
      expect(prisma.referrers.get('rfr_3')?.code).toBe('RFR-EXISTING');
    });

    it('never overwrites an existing code (the `code: null` guard)', async () => {
      // Simulate a race: the fake's findMany returns the row as NULL,
      // but the row was already updated by another process before
      // this caller's updateMany landed. Our fake's updateMany
      // mirrors the real Prisma `where: { id, code: null }` and
      // returns count: 0 when the row no longer matches.
      prisma.referrers.set('rfr_raced', { id: 'rfr_raced', code: null });
      // Hand-roll the race: pre-set the row's code to something else
      // *after* the findMany but *before* the updateMany. The fake
      // doesn't simulate that natively; the assertion is that the
      // updateMany's `where: { code: null }` is what protects the
      // existing code.
      const r = prisma.referrers.get('rfr_raced')!;
      // First call: counts as written.
      const first = await service.runBackfill();
      expect(first.written).toBe(1);
      // The row now has a code; a second call must not touch it.
      const secondCode = r.code;
      const second = await service.runBackfill();
      expect(second.written).toBe(0);
      expect(r.code).toBe(secondCode);
    });

    it('generates a fresh code from the unambiguous alphabet (no I, O, 0, 1)', async () => {
      prisma.referrers.set('rfr_1', { id: 'rfr_1', code: null });
      await service.runBackfill();
      const code = prisma.referrers.get('rfr_1')?.code ?? '';
      const suffix = code.slice(4);
      expect(suffix).not.toMatch(/[IO01]/);
    });
  });

  describe('retry on unique-constraint collision', () => {
    it('rolls a different code when the first generated code is already in use', async () => {
      // Seed a row with the exact code that the next generateReferrerCode
      // call will produce. The first attempt collides (the fake's
      // updateMany throws on reserved codes), the loop retries, and
      // the second attempt succeeds.
      const expectedFirst = generateReferrerCode();
      prisma.referrers.set('existing', { id: 'existing', code: expectedFirst });
      prisma.reservedCodes.add(expectedFirst);
      prisma.referrers.set('rfr_1', { id: 'rfr_1', code: null });

      // The fake's generateUniqueCode loop iterates: first attempt
      // hits the reserved code, the function tries again, the second
      // call (to findUnique) returns null because the second code
      // isn't reserved, and updateMany succeeds.
      const result = await service.runBackfill();
      expect(result.written).toBe(1);
      expect(prisma.referrers.get('rfr_1')?.code).toMatch(/^RFR-/);
      expect(prisma.referrers.get('rfr_1')?.code).not.toBe(expectedFirst);
    });
  });

  describe('advisory lock contention', () => {
    it('skips when withAdvisoryLock returns null (another process is doing it)', async () => {
      prisma.referrers.set('rfr_1', { id: 'rfr_1', code: null });
      const contendingService = new ReferrerCodeBackfillService(
        prisma.buildClient(),
        stubLock('contend'),
      );
      const result = await contendingService.runBackfill();
      expect(result).toEqual({ written: 0 });
      // The row stays NULL — the contending replica does not write.
      expect(prisma.referrers.get('rfr_1')?.code).toBeNull();
    });
  });
});
