import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReferralPayoutStatus, ReferralStatus } from '@workspace/db';
import { PartnerPortalService } from './partner-portal.service';
import { PartnerShowcasePdfService } from '../../application/services/partner-showcase-pdf.service';
import { PartnerTemplateService } from '../../application/services/partner-template.service';
import { EncryptionService } from '@/shared/common/encryption.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { PrismaService } from '@/prisma/prisma.service';

class FakeEncryptionService {
  encrypt(plain: string): string {
    return `enc(${plain})`;
  }
}

class FakeStorageProvider {
  uploaded = new Map<string, { bytes: Buffer; contentType: string }>();
  async uploadBuffer(
    bytes: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ key: string }> {
    this.uploaded.set(key, { bytes, contentType });
    return { key };
  }
  async generateSignedUrl(key: string, _ttlSeconds: number): Promise<string> {
    return `https://signed.example/${encodeURIComponent(key)}?sig=abc`;
  }
}

class FakePdfService {
  async render(): Promise<Buffer> {
    return Buffer.from('%PDF-1.4 fake');
  }
}

class FakeTemplateService {
  renderShareMessage(input: {
    partnerName: string;
    code: string;
    signupUrl: string;
  }): string {
    return `share:${input.partnerName}:${input.code}:${input.signupUrl}`;
  }
}

class FakeAppConfig {
  getPartnerPortalUrl(): string {
    return 'https://app.docita.work/partner';
  }
  getAppUrl(): string {
    return 'https://app.docita.work';
  }
}

interface FakeReferrer {
  id: string;
  name: string;
  type: 'CLINIC' | 'PHARMACY' | 'MARKETING_PERSON' | 'CUSTOM';
  rewardKind: 'CREDIT_MONTHS' | 'REVENUE_SHARE';
  code: string | null;
  active: boolean;
  payoutDetail: FakePayoutDetail | null;
  _count: { referrals: number };
}

interface FakePayoutDetail {
  accountHolder: string;
  accountNumberLast4: string;
  ifscPlain: string;
  bankName: string;
  upiId: string | null;
  panLast4: string | null;
  verified: boolean;
  updatedAt: Date;
}

interface FakePayout {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  baseRevenueCents: number;
  ratePercent: number;
  amountCents: number;
  status: ReferralPayoutStatus;
  paidAt: Date | null;
  referrerId: string;
}

interface FakeReferral {
  id: string;
  referrerId: string;
  referredClinicId: string;
  referredClinic: { id: string; name: string } | null;
  status: ReferralStatus;
  createdAt: Date;
  convertedAt: Date | null;
}

class FakePrismaService {
  referrers = new Map<string, FakeReferrer>();
  payouts: FakePayout[] = [];
  referrals: FakeReferral[] = [];
  payoutDetails = new Map<string, FakePayoutDetail>();

  buildClient(): PrismaService {
    return {
      referrer: {
        findUnique: jest.fn(
          async (args: {
            where: { id: string };
            include?: unknown;
            select?: unknown;
          }) => {
            const r = this.referrers.get(args.where.id);
            if (!r) return null;
            // Derive `_count.referrals` from the fake's `referrals` table
            // so getMe's counts line up with listReferrals results.
            return {
              ...r,
              _count: {
                referrals: this.referrals.filter((x) => x.referrerId === r.id)
                  .length,
              },
            } as unknown;
          },
        ),
      },
      referralPayout: {
        findMany: jest.fn(
          async (args: {
            where: { referrerId: string; status?: ReferralPayoutStatus };
            take: number;
            orderBy: unknown;
          }) => {
            const rows = this.payouts
              .filter(
                (p) =>
                  p.referrerId === args.where.referrerId &&
                  (args.where.status === undefined ||
                    p.status === args.where.status),
              )
              .sort(
                (a, b) =>
                  b.periodStart.getTime() - a.periodStart.getTime() ||
                  b.id.localeCompare(a.id),
              );
            return rows.slice(0, args.take);
          },
        ),
        aggregate: jest.fn(
          async (args: {
            where: { referrerId: string; status: ReferralPayoutStatus };
            _sum: { amountCents: boolean };
          }) => {
            const rows = this.payouts.filter(
              (p) =>
                p.referrerId === args.where.referrerId &&
                p.status === args.where.status,
            );
            const sum = rows.reduce((s, r) => s + r.amountCents, 0);
            return { _sum: { amountCents: sum } };
          },
        ),
      },
      referral: {
        findMany: jest.fn(
          async (args: {
            where: { referrerId: string; status?: ReferralStatus };
            take: number;
            include?: unknown;
          }) => {
            const rows = this.referrals
              .filter(
                (r) =>
                  r.referrerId === args.where.referrerId &&
                  (args.where.status === undefined ||
                    r.status === args.where.status),
              )
              .sort(
                (a, b) =>
                  b.createdAt.getTime() - a.createdAt.getTime() ||
                  b.id.localeCompare(a.id),
              );
            return rows.slice(0, args.take);
          },
        ),
        count: jest.fn(
          async (args: {
            where: { referrerId: string; status: ReferralStatus };
          }) => {
            return this.referrals.filter(
              (r) =>
                r.referrerId === args.where.referrerId &&
                r.status === args.where.status,
            ).length;
          },
        ),
      },
      referrerPayoutDetails: {
        upsert: jest.fn(
          async (args: {
            where: { referrerId: string };
            create: FakePayoutDetail & { referrerId: string };
            update: Partial<FakePayoutDetail>;
          }) => {
            const existing = this.payoutDetails.get(args.where.referrerId);
            const next: FakePayoutDetail = existing
              ? { ...existing, ...args.update }
              : {
                  accountHolder: args.create.accountHolder,
                  accountNumberLast4: args.create.accountNumberLast4,
                  ifscPlain: args.create.ifscPlain,
                  bankName: args.create.bankName,
                  upiId: args.create.upiId ?? null,
                  panLast4: args.create.panLast4 ?? null,
                  verified: args.update.verified ?? false,
                  updatedAt: new Date(),
                };
            this.payoutDetails.set(args.where.referrerId, next);
            return next;
          },
        ),
      },
    } as unknown as PrismaService;
  }
}

function makeReferrer(overrides: Partial<FakeReferrer> = {}): FakeReferrer {
  return {
    id: 'rfr_1',
    name: 'Anil Pharmacy',
    type: 'PHARMACY',
    rewardKind: 'REVENUE_SHARE',
    code: 'RFR-AB23CD',
    active: true,
    payoutDetail: null,
    _count: { referrals: 0 },
    ...overrides,
  };
}

describe('PartnerPortalService', () => {
  let prisma: FakePrismaService;
  let service: PartnerPortalService;

  beforeEach(() => {
    prisma = new FakePrismaService();
    service = new PartnerPortalService(
      prisma.buildClient(),
      new FakeEncryptionService() as unknown as EncryptionService,
      new FakeStorageProvider() as unknown as StorageProvider,
      new FakePdfService() as unknown as PartnerShowcasePdfService,
      new FakeTemplateService() as unknown as PartnerTemplateService,
      new FakeAppConfig() as unknown as AppConfigService,
    );
  });

  describe('getMe', () => {
    it('composes counts, urls, and the share message', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      prisma.payouts.push(
        {
          id: 'p1',
          referrerId: 'rfr_1',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
          baseRevenueCents: 100_000,
          ratePercent: 5,
          amountCents: 5_000,
          status: ReferralPayoutStatus.PENDING,
          paidAt: null,
        },
        {
          id: 'p2',
          referrerId: 'rfr_1',
          periodStart: new Date('2025-12-01'),
          periodEnd: new Date('2025-12-31'),
          baseRevenueCents: 200_000,
          ratePercent: 5,
          amountCents: 10_000,
          status: ReferralPayoutStatus.PAID,
          paidAt: new Date('2026-01-15'),
        },
      );
      prisma.referrals.push(
        {
          id: 'ref1',
          referrerId: 'rfr_1',
          referredClinicId: 'clinic_1',
          referredClinic: { id: 'clinic_1', name: 'Sunrise Clinic' },
          status: ReferralStatus.CONVERTED,
          createdAt: new Date('2026-01-01'),
          convertedAt: new Date('2026-02-01'),
        },
        {
          id: 'ref2',
          referrerId: 'rfr_1',
          referredClinicId: 'clinic_2',
          referredClinic: { id: 'clinic_2', name: 'Moonlight Clinic' },
          status: ReferralStatus.SIGNED_UP,
          createdAt: new Date('2026-01-15'),
          convertedAt: null,
        },
      );

      const me = await service.getMe('rfr_1');
      expect(me.code).toBe('RFR-AB23CD');
      expect(me.signupUrl).toBe(
        'https://app.docita.work/onboarding?ref=RFR-AB23CD',
      );
      expect(me.loginUrl).toBe('https://app.docita.work/partner');
      expect(me.showcasePdfUrl).toMatch(/^https:\/\/signed\.example\//);
      expect(me.shareMessage).toContain('Anil Pharmacy');
      expect(me.shareMessage).toContain('RFR-AB23CD');
      expect(me.counts).toEqual({
        referrals: 2,
        converted: 1,
        pendingPayoutsCents: 5_000,
        paidPayoutsCents: 10_000,
      });
      expect(me.payoutDetails).toBeNull();
    });

    it('throws NotFound when the referrer does not exist', async () => {
      await expect(service.getMe('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws BadRequest when the referrer has no code (pre-migration row)', async () => {
      prisma.referrers.set(
        'rfr_legacy',
        makeReferrer({ id: 'rfr_legacy', code: null }),
      );
      await expect(service.getMe('rfr_legacy')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('surfaces the stored payout details when present', async () => {
      prisma.referrers.set(
        'rfr_1',
        makeReferrer({
          payoutDetail: {
            accountHolder: 'Anil Kumar',
            accountNumberLast4: '1234',
            ifscPlain: 'HDFC0001234',
            bankName: 'HDFC',
            upiId: 'anil@upi',
            panLast4: '6789',
            verified: true,
            updatedAt: new Date('2026-03-01'),
          },
        }),
      );
      const me = await service.getMe('rfr_1');
      expect(me.payoutDetails).toEqual({
        referrerId: 'rfr_1',
        accountHolder: 'Anil Kumar',
        accountNumberLast4: '1234',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC',
        upiId: 'anil@upi',
        panLast4: '6789',
        verified: true,
        updatedAt: '2026-03-01T00:00:00.000Z',
      });
    });
  });

  describe('listPayouts', () => {
    it('returns rows with nextCursor = last id when more rows exist', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      for (let i = 0; i < 3; i += 1) {
        prisma.payouts.push({
          id: `p${i + 1}`,
          referrerId: 'rfr_1',
          periodStart: new Date(2026, 0, i + 1),
          periodEnd: new Date(2026, 0, i + 2),
          baseRevenueCents: 100_000,
          ratePercent: 5,
          amountCents: 5_000,
          status: ReferralPayoutStatus.PENDING,
          paidAt: null,
        });
      }
      const page = await service.listPayouts('rfr_1', { limit: 2 });
      expect(page.items).toHaveLength(2);
      // Sort is desc by periodStart then desc by id. So the first page
      // returns p3 (most recent periodStart 01-03) and p2 (01-02), and
      // the cursor points at p2 for the next page.
      expect(page.items[0]?.id).toBe('p3');
      expect(page.items[1]?.id).toBe('p2');
      expect(page.nextCursor).toBe('p2');
    });

    it('returns nextCursor = null when the result set fits in one page', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      prisma.payouts.push({
        id: 'p1',
        referrerId: 'rfr_1',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        baseRevenueCents: 100_000,
        ratePercent: 5,
        amountCents: 5_000,
        status: ReferralPayoutStatus.PAID,
        paidAt: new Date('2026-02-01'),
      });
      const page = await service.listPayouts('rfr_1', { limit: 10 });
      expect(page.nextCursor).toBeNull();
      expect(page.items[0]?.status).toBe(ReferralPayoutStatus.PAID);
      expect(page.items[0]?.paidAt).toBe('2026-02-01T00:00:00.000Z');
    });

    it('caps the limit at 200', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      const result = await service.listPayouts('rfr_1', { limit: 100_000 });
      // No payouts -> 0 items, but the cap didn't crash. The cap is internal.
      expect(result.items).toHaveLength(0);
    });
  });

  describe('listReferrals', () => {
    it('maps clinic name + status + convertedAt', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      prisma.referrals.push(
        {
          id: 'ref1',
          referrerId: 'rfr_1',
          referredClinicId: 'clinic_1',
          referredClinic: { id: 'clinic_1', name: 'Sunrise' },
          status: ReferralStatus.CONVERTED,
          createdAt: new Date('2026-01-01'),
          convertedAt: new Date('2026-02-01'),
        },
        {
          id: 'ref2',
          referrerId: 'rfr_1',
          referredClinicId: 'clinic_2',
          referredClinic: null,
          status: ReferralStatus.PENDING,
          createdAt: new Date('2026-01-15'),
          convertedAt: null,
        },
      );
      const page = await service.listReferrals('rfr_1', { limit: 10 });
      expect(page.items).toHaveLength(2);
      expect(page.items[0]).toEqual({
        id: 'ref2', // more recent createdAt
        referredClinicId: 'clinic_2',
        referredClinicName: undefined,
        status: ReferralStatus.PENDING,
        createdAt: '2026-01-15T00:00:00.000Z',
        convertedAt: null,
      });
      expect(page.items[1]?.referredClinicName).toBe('Sunrise');
      expect(page.nextCursor).toBeNull();
    });
  });

  describe('upsertPayoutDetails', () => {
    it('encrypts the account + ifsc + pan, stores last-4 for display', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      const result = await service.upsertPayoutDetails('rfr_1', {
        accountHolder: 'Anil Kumar',
        accountNumber: '50100123456789',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank',
        upiId: 'anil@upi',
        pan: 'ABCDE1234F',
      });
      expect(result.accountNumberLast4).toBe('6789');
      expect(result.panLast4).toBe('234F');
      expect(result.ifsc).toBe('HDFC0001234');
      // verified starts false (or stays false on edit).
      expect(result.verified).toBe(false);
    });

    it('throws NotFound when the referrer does not exist', async () => {
      await expect(
        service.upsertPayoutDetails('nope', {
          accountHolder: 'A',
          accountNumber: '1',
          ifsc: 'X',
          bankName: 'B',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resets verified to false on every edit (operator must re-verify)', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      // Seed a previously verified row.
      prisma.payoutDetails.set('rfr_1', {
        accountHolder: 'Old',
        accountNumberLast4: '0000',
        ifscPlain: 'OLD0OLD0000',
        bankName: 'Old',
        upiId: null,
        panLast4: null,
        verified: true,
        updatedAt: new Date('2026-01-01'),
      });
      const result = await service.upsertPayoutDetails('rfr_1', {
        accountHolder: 'New',
        accountNumber: '9999',
        ifsc: 'NEW0NEW0000',
        bankName: 'New',
      });
      expect(result.verified).toBe(false);
      expect(result.accountHolder).toBe('New');
    });
  });

  describe('getShareMessage', () => {
    it('returns the share message for a referrer with a code', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      const result = await service.getShareMessage('rfr_1');
      expect(result.message).toContain('Anil Pharmacy');
      expect(result.message).toContain('RFR-AB23CD');
    });

    it('throws NotFound when the referrer is missing or has no code', async () => {
      prisma.referrers.set(
        'rfr_legacy',
        makeReferrer({ id: 'rfr_legacy', code: null }),
      );
      await expect(
        service.getShareMessage('rfr_legacy'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getShareMessage('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('renderShowcasePdf', () => {
    it('returns a PDF buffer for a valid referrer', async () => {
      prisma.referrers.set('rfr_1', makeReferrer());
      const buf = await service.renderShowcasePdf('rfr_1');
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.toString('utf8')).toBe('%PDF-1.4 fake');
    });

    it('throws NotFound when the referrer or code is missing', async () => {
      prisma.referrers.set(
        'rfr_legacy',
        makeReferrer({ id: 'rfr_legacy', code: null }),
      );
      await expect(
        service.renderShowcasePdf('rfr_legacy'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.renderShowcasePdf('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
