import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferralCodeResolverService } from './referral-code-resolver.service';

interface FakeReferrer {
  id: string;
  code: string;
  active: boolean;
}

interface FakeClinic {
  id: string;
  referralCode: string | null;
}

class FakePrismaService {
  referrers = new Map<string, FakeReferrer>();
  clinics = new Map<string, FakeClinic>();

  seedReferrer(r: FakeReferrer) {
    this.referrers.set(r.code, r);
  }

  seedClinic(c: FakeClinic) {
    this.clinics.set(c.id, c);
    if (c.referralCode) this.clinics.set(c.referralCode, c);
  }

  buildClient() {
    return {
      referrer: {
        findUnique: jest.fn(async (args: { where: { code: string } }) => {
          return this.referrers.get(args.where.code) ?? null;
        }),
      },
      clinic: {
        findUnique: jest.fn(
          async (args: { where: { referralCode: string } }) => {
            return this.clinics.get(args.where.referralCode) ?? null;
          },
        ),
      },
      // The resolver only uses `referrer.findUnique` and `clinic.findUnique`,
      // so a structural cast keeps the test focused on the resolution
      // contract without a full PrismaService mock.
    } as unknown as ConstructorParameters<
      typeof ReferralCodeResolverService
    >[0];
  }
}

describe('ReferralCodeResolverService', () => {
  let prisma: FakePrismaService;
  let resolver: ReferralCodeResolverService;

  beforeEach(() => {
    prisma = new FakePrismaService();
    // The resolver only uses `referrer.findUnique` and `clinic.findUnique`,
    // so a structural cast keeps the test focused on the resolution
    // contract without a full PrismaService mock.
    resolver = new ReferralCodeResolverService(
      prisma.buildClient() as unknown as ConstructorParameters<
        typeof ReferralCodeResolverService
      >[0],
    );
  });

  describe('resolveCode', () => {
    it('returns NONE for blank / null / invalid input', async () => {
      expect(await resolver.resolveCode('')).toEqual({ kind: 'NONE' });
      expect(await resolver.resolveCode('   ')).toEqual({ kind: 'NONE' });
      expect(await resolver.resolveCode('nope')).toEqual({ kind: 'NONE' });
      expect(await resolver.resolveCode('RFR-IO0101')).toEqual({
        kind: 'NONE',
      });
    });

    it('uppercases and trims before resolving', async () => {
      prisma.seedReferrer({ id: 'rfr_1', code: 'RFR-AB23CD', active: true });
      const result = await resolver.resolveCode('  rfr-ab23cd  ');
      expect(result).toEqual({ kind: 'PARTNER', referrerId: 'rfr_1' });
    });

    it('resolves an active partner code to PARTNER', async () => {
      prisma.seedReferrer({ id: 'rfr_1', code: 'RFR-AB23CD', active: true });
      const result = await resolver.resolveCode('RFR-AB23CD');
      expect(result).toEqual({ kind: 'PARTNER', referrerId: 'rfr_1' });
    });

    it('falls through to the clinic table when the partner is inactive', async () => {
      prisma.seedReferrer({ id: 'rfr_1', code: 'RFR-AB23CD', active: false });
      prisma.seedClinic({
        id: 'clinic_1',
        referralCode: 'RFR-AB23CD',
      });
      const result = await resolver.resolveCode('RFR-AB23CD');
      // The partner exists but is inactive — must not be returned. The
      // legacy clinic path also matches, so the caller can link either
      // way. (Referral.apply logic is the final arbiter.)
      expect(result).toEqual({ kind: 'CLINIC', clinicId: 'clinic_1' });
    });

    it('does not resolve legacy short clinic codes (DRSHARMA etc.)', async () => {
      // The resolver only recognizes the new RFR-XXXXXX alphabet. Legacy
      // clinic codes are still accepted by the in-line `applyReferralCodeAtSettings`
      // path in `ReferralService` (it bypasses `normalizeReferrerCodeInput`),
      // but this resolver intentionally does not — it's the partner-only
      // path used by the welcome pipeline + partner auth.
      prisma.seedClinic({ id: 'clinic_1', referralCode: 'DRSHARMA' });
      const result = await resolver.resolveCode('DRSHARMA');
      expect(result).toEqual({ kind: 'NONE' });
    });

    it('returns NONE when neither table matches', async () => {
      const result = await resolver.resolveCode('RFR-NOTHERE');
      expect(result).toEqual({ kind: 'NONE' });
    });

    it('prefers the partner path over the clinic path (same code on both)', async () => {
      prisma.seedReferrer({ id: 'rfr_1', code: 'RFR-AB23CD', active: true });
      prisma.seedClinic({ id: 'clinic_1', referralCode: 'RFR-AB23CD' });
      const result = await resolver.resolveCode('RFR-AB23CD');
      expect(result).toEqual({ kind: 'PARTNER', referrerId: 'rfr_1' });
    });
  });
});
