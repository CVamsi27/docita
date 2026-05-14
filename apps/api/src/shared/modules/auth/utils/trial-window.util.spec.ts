import { SubscriptionStatus } from '@workspace/db';
import { getTrialGraceEndsAt, getTrialWindowState } from './trial-window.util';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('getTrialWindowState', () => {
  const now = new Date('2026-05-14T12:00:00Z');

  it('returns null when subscription is not TRIALING', () => {
    expect(
      getTrialWindowState({
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        trialEnd: new Date(now.getTime() - 5 * DAY_MS),
        now,
      }),
    ).toBeNull();
  });

  it('returns ACTIVE when trialEnd is in the future', () => {
    expect(
      getTrialWindowState({
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEnd: new Date(now.getTime() + 10 * DAY_MS),
        now,
      }),
    ).toBe('ACTIVE');
  });

  it('returns ACTIVE when trialEnd is null (defensive default)', () => {
    expect(
      getTrialWindowState({
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEnd: null,
        now,
      }),
    ).toBe('ACTIVE');
  });

  it('returns GRACE within the 3-day window after trial end', () => {
    expect(
      getTrialWindowState({
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEnd: new Date(now.getTime() - 1 * DAY_MS),
        now,
      }),
    ).toBe('GRACE');
  });

  it('returns GRACE on the boundary just before 3 full days after trial end', () => {
    expect(
      getTrialWindowState({
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEnd: new Date(now.getTime() - 3 * DAY_MS + 1),
        now,
      }),
    ).toBe('GRACE');
  });

  it('returns EXPIRED at exactly 3 days after trial end', () => {
    expect(
      getTrialWindowState({
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEnd: new Date(now.getTime() - 3 * DAY_MS),
        now,
      }),
    ).toBe('EXPIRED');
  });

  it('returns EXPIRED well past the grace window', () => {
    expect(
      getTrialWindowState({
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEnd: new Date(now.getTime() - 30 * DAY_MS),
        now,
      }),
    ).toBe('EXPIRED');
  });
});

describe('getTrialGraceEndsAt', () => {
  it('returns null when trialEnd is null', () => {
    expect(getTrialGraceEndsAt(null)).toBeNull();
  });

  it('returns trialEnd + 3 days', () => {
    const trialEnd = new Date('2026-05-10T00:00:00Z');
    const result = getTrialGraceEndsAt(trialEnd);
    expect(result?.toISOString()).toBe('2026-05-13T00:00:00.000Z');
  });
});
