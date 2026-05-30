import { describe, expect, it, jest } from '@jest/globals';
import { type ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import { hasPriorSubscriptionForEmail } from './onboarding-helpers';

function makePersistence(opts: {
  users?: { clinicId: string | null }[];
  existingSubscription?: { id: string } | null;
}) {
  const findMany = jest.fn(async (_args: unknown) => opts.users ?? []);
  const findFirst = jest.fn(
    async (_args: unknown) => opts.existingSubscription ?? null,
  );
  const persistence = {
    runUnrestricted: (cb: () => unknown) => cb(),
    user: { findMany },
    subscription: { findFirst },
  } as unknown as ClinicPersistencePort;
  return { persistence, findMany, findFirst };
}

describe('hasPriorSubscriptionForEmail', () => {
  it('returns false for a blank email without querying', async () => {
    const { persistence, findMany } = makePersistence({});
    expect(await hasPriorSubscriptionForEmail(persistence, '  ')).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns false when the email has never owned a clinic', async () => {
    const { persistence, findFirst } = makePersistence({ users: [] });
    expect(
      await hasPriorSubscriptionForEmail(persistence, 'new@clinic.test'),
    ).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns true when a prior clinic has ANY subscription — including a trial that never paid', async () => {
    const { persistence, findFirst } = makePersistence({
      users: [{ clinicId: 'clinic_1' }],
      existingSubscription: { id: 'sub_trial_1' },
    });
    expect(
      await hasPriorSubscriptionForEmail(persistence, 'repeat@clinic.test'),
    ).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { clinicId: { in: ['clinic_1'] } },
      select: { id: true },
    });
  });

  it('returns false when prior clinics exist but none has a subscription', async () => {
    const { persistence } = makePersistence({
      users: [{ clinicId: 'clinic_1' }, { clinicId: null }],
      existingSubscription: null,
    });
    expect(
      await hasPriorSubscriptionForEmail(persistence, 'partial@clinic.test'),
    ).toBe(false);
  });
});
