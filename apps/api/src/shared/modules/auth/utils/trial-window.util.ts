import { SubscriptionStatus } from '@workspace/db';
import { TRIAL_GRACE_DAYS, type TrialWindowState } from '@workspace/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getTrialWindowState(params: {
  subscriptionStatus: SubscriptionStatus;
  trialEnd: Date | null | undefined;
  now?: Date;
}): TrialWindowState | null {
  if (params.subscriptionStatus !== SubscriptionStatus.TRIALING) {
    return null;
  }
  if (!params.trialEnd) {
    return 'ACTIVE';
  }
  const now = (params.now ?? new Date()).getTime();
  const trialEndMs = new Date(params.trialEnd).getTime();
  if (now < trialEndMs) {
    return 'ACTIVE';
  }
  if (now < trialEndMs + TRIAL_GRACE_DAYS * DAY_MS) {
    return 'GRACE';
  }
  return 'EXPIRED';
}

export function getTrialGraceEndsAt(
  trialEnd: Date | null | undefined,
): Date | null {
  if (!trialEnd) return null;
  return new Date(new Date(trialEnd).getTime() + TRIAL_GRACE_DAYS * DAY_MS);
}
