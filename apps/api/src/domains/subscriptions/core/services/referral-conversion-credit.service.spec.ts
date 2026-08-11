import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferralConversionCreditService } from './referral-conversion-credit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createFixedClockMock } from '@/test-utils';
import {
  PARTNER_PERSISTENCE_PORT,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';

type AnyAsync<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => Promise<unknown>;

describe('ReferralConversionCreditService', () => {
  const prismaMock = {
    subscriptionPayment: { count: jest.fn<AnyAsync>() as jest.Mock<AnyAsync> },
    referral: {
      findFirst: jest.fn<AnyAsync>() as jest.Mock<AnyAsync>,
      updateMany: jest.fn<AnyAsync>() as jest.Mock<AnyAsync>,
    },
    clinic: { update: jest.fn<AnyAsync>() as jest.Mock<AnyAsync> },
    referralCredit: { create: jest.fn<AnyAsync>() as jest.Mock<AnyAsync> },
    $transaction: jest.fn<AnyAsync>() as jest.Mock<AnyAsync>,
  };

  let service: ReferralConversionCreditService;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    prismaMock.$transaction.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cb: any) => cb(prismaMock),
    );
    const clock = createFixedClockMock('2026-08-10T00:00:00.000Z');
    service = new ReferralConversionCreditService(
      prismaService as never,
      clock,
    );
  });

  it('skips when the clinic has more than one paid payment (already past first)', async () => {
    prismaMock.subscriptionPayment.count.mockResolvedValueOnce(2);

    await service.applyOnFirstPayment('clinic-1');

    expect(prismaMock.referral.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.referral.updateMany).not.toHaveBeenCalled();
  });

  it('skips when no matching SIGNED_UP referral exists', async () => {
    prismaMock.subscriptionPayment.count.mockResolvedValueOnce(1);
    prismaMock.referral.findFirst.mockResolvedValueOnce(null);

    await service.applyOnFirstPayment('clinic-1');

    expect(prismaMock.referral.updateMany).not.toHaveBeenCalled();
  });

  it('flips the partner referral to CONVERTED and grants no free credits', async () => {
    prismaMock.subscriptionPayment.count.mockResolvedValueOnce(1);
    prismaMock.referral.findFirst.mockResolvedValueOnce({
      id: 'ref-1',
      referrerClinicId: null,
      referrerClinic: null,
    });
    prismaMock.referral.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.applyOnFirstPayment('clinic-1');

    expect(prismaMock.referral.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ref-1', status: 'SIGNED_UP', creditApplied: false },
        data: expect.objectContaining({ status: 'CONVERTED' }),
      }),
    );
    expect(prismaMock.clinic.update).not.toHaveBeenCalled();
    expect(prismaMock.referralCredit.create).not.toHaveBeenCalled();
  });

  it('increments referrer credits and writes the audit row for clinic-to-clinic referrals', async () => {
    prismaMock.subscriptionPayment.count.mockResolvedValueOnce(1);
    prismaMock.referral.findFirst.mockResolvedValueOnce({
      id: 'ref-2',
      referrerClinicId: 'clinic-a',
      referrerClinic: { referralCreditsMonths: 0 },
    });
    prismaMock.referral.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.applyOnFirstPayment('clinic-b');

    expect(prismaMock.clinic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clinic-a' },
        data: { referralCreditsMonths: { increment: 1 } },
      }),
    );
    expect(prismaMock.referralCredit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clinicId: 'clinic-a',
          referralId: 'ref-2',
          creditMonths: 1,
        }),
      }),
    );
  });

  it('skips the credit grant when the referrer has hit the annual cap', async () => {
    prismaMock.subscriptionPayment.count.mockResolvedValueOnce(1);
    prismaMock.referral.findFirst.mockResolvedValueOnce({
      id: 'ref-3',
      referrerClinicId: 'clinic-a',
      referrerClinic: { referralCreditsMonths: 999 },
    });

    await service.applyOnFirstPayment('clinic-b');

    expect(prismaMock.referral.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.clinic.update).not.toHaveBeenCalled();
  });
});

// Reference the port to ensure the import is not stripped by ts-prune.
// (The PARTNER_PERSISTENCE_PORT is the canonical DI token used in
//  SubscriptionsCommonProviders for this service.)
void PARTNER_PERSISTENCE_PORT;
