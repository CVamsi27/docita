import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ReferralService } from './referral.service';
import { PrismaService } from '@/prisma/prisma.service';

interface FakeReferral {
  id: string;
  referredClinicId: string;
  referrerClinicId: string;
  status: 'SIGNED_UP' | 'CONVERTED';
  creditApplied: boolean;
  referrerClinic: { referralCreditsMonths: number };
}

interface FakePaymentRow {
  clinicId: string;
  status: string;
}

class InMemoryReferralStore {
  private referrals = new Map<string, FakeReferral>();
  private credits: Array<{ id: string; clinicId: string; referralId: string }> =
    [];
  private clinicCreditMonths = new Map<string, number>();
  private payments: FakePaymentRow[] = [];

  seedReferral(ref: FakeReferral) {
    this.referrals.set(ref.id, { ...ref });
    if (!this.clinicCreditMonths.has(ref.referrerClinicId)) {
      this.clinicCreditMonths.set(
        ref.referrerClinicId,
        ref.referrerClinic.referralCreditsMonths,
      );
    }
  }

  seedPayments(payments: FakePaymentRow[]) {
    this.payments = [...payments];
  }

  buildClient() {
    const subscriptionPayment = {
      count: jest.fn(async (args: { where: FakePaymentRow }) => {
        return this.payments.filter(
          (p) =>
            p.clinicId === args.where.clinicId &&
            p.status === args.where.status,
        ).length;
      }),
    };

    const referral = {
      findFirst: jest.fn(
        async (args: {
          where: {
            referredClinicId: string;
            status: string;
            creditApplied: boolean;
          };
        }) => {
          for (const ref of this.referrals.values()) {
            if (
              ref.referredClinicId === args.where.referredClinicId &&
              ref.status === args.where.status &&
              ref.creditApplied === args.where.creditApplied
            ) {
              const months =
                this.clinicCreditMonths.get(ref.referrerClinicId) ?? 0;
              return {
                ...ref,
                referrerClinic: { referralCreditsMonths: months },
              };
            }
          }
          return null;
        },
      ),
      updateMany: jest.fn(
        async (args: {
          where: { id: string; status: string; creditApplied: boolean };
          data: {
            status: 'CONVERTED';
            creditApplied: true;
            convertedAt: Date;
          };
        }) => {
          const target = this.referrals.get(args.where.id);
          if (
            !target ||
            target.status !== args.where.status ||
            target.creditApplied !== args.where.creditApplied
          ) {
            return { count: 0 };
          }
          target.status = args.data.status;
          target.creditApplied = args.data.creditApplied;
          this.referrals.set(target.id, target);
          return { count: 1 };
        },
      ),
    };

    const clinic = {
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: { referralCreditsMonths: { increment: number } };
        }) => {
          const current = this.clinicCreditMonths.get(args.where.id) ?? 0;
          const next = current + args.data.referralCreditsMonths.increment;
          this.clinicCreditMonths.set(args.where.id, next);
          return { id: args.where.id, referralCreditsMonths: next };
        },
      ),
    };

    const referralCredit = {
      create: jest.fn(
        async (args: {
          data: { clinicId: string; referralId: string; creditMonths: number };
        }) => {
          const row = {
            id: `rc_${this.credits.length + 1}`,
            clinicId: args.data.clinicId,
            referralId: args.data.referralId,
          };
          this.credits.push(row);
          return row;
        },
      ),
    };

    return {
      subscriptionPayment,
      referral,
      clinic,
      referralCredit,
      $transaction: async (fn: (client: unknown) => Promise<unknown>) => {
        return fn({ subscriptionPayment, referral, clinic, referralCredit });
      },
    };
  }

  getCreditsCreatedFor(clinicId: string) {
    return this.credits.filter((row) => row.clinicId === clinicId);
  }

  getClinicCreditMonths(clinicId: string) {
    return this.clinicCreditMonths.get(clinicId) ?? 0;
  }
}

describe('ReferralService.applyReferralCreditsOnFirstPayment', () => {
  let store: InMemoryReferralStore;
  let service: ReferralService;
  let prisma: ReturnType<InMemoryReferralStore['buildClient']>;

  beforeEach(async () => {
    store = new InMemoryReferralStore();
    prisma = store.buildClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        {
          provide: PrismaService,
          useValue: prisma as unknown as PrismaService,
        },
      ],
    }).compile();

    service = module.get(ReferralService);
  });

  it('applies one credit on the first payment', async () => {
    store.seedReferral({
      id: 'ref_1',
      referredClinicId: 'clinic_b',
      referrerClinicId: 'clinic_a',
      status: 'SIGNED_UP',
      creditApplied: false,
      referrerClinic: { referralCreditsMonths: 0 },
    });
    store.seedPayments([{ clinicId: 'clinic_b', status: 'paid' }]);

    await service.applyReferralCreditsOnFirstPayment('clinic_b');

    expect(store.getCreditsCreatedFor('clinic_a')).toHaveLength(1);
    expect(store.getClinicCreditMonths('clinic_a')).toBe(1);
  });

  it('does not double-credit on concurrent first-payment runs', async () => {
    store.seedReferral({
      id: 'ref_1',
      referredClinicId: 'clinic_b',
      referrerClinicId: 'clinic_a',
      status: 'SIGNED_UP',
      creditApplied: false,
      referrerClinic: { referralCreditsMonths: 0 },
    });
    store.seedPayments([{ clinicId: 'clinic_b', status: 'paid' }]);

    await Promise.all([
      service.applyReferralCreditsOnFirstPayment('clinic_b'),
      service.applyReferralCreditsOnFirstPayment('clinic_b'),
    ]);

    expect(store.getCreditsCreatedFor('clinic_a')).toHaveLength(1);
    expect(store.getClinicCreditMonths('clinic_a')).toBe(1);
  });

  it('skips when payment count is greater than one (not first payment)', async () => {
    store.seedReferral({
      id: 'ref_1',
      referredClinicId: 'clinic_b',
      referrerClinicId: 'clinic_a',
      status: 'SIGNED_UP',
      creditApplied: false,
      referrerClinic: { referralCreditsMonths: 0 },
    });
    store.seedPayments([
      { clinicId: 'clinic_b', status: 'paid' },
      { clinicId: 'clinic_b', status: 'paid' },
    ]);

    await service.applyReferralCreditsOnFirstPayment('clinic_b');

    expect(prisma.referral.findFirst).not.toHaveBeenCalled();
    expect(store.getCreditsCreatedFor('clinic_a')).toHaveLength(0);
  });
});
