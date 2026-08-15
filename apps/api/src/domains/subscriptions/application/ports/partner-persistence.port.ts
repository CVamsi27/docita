import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

/**
 * Prisma surface used by the partner-portal / referral core services
 * (partner-auth, partner-portal, referral-code-resolver, referral,
 *  referrer-code-backfill, referrer-welcome, facility-lead). Narrowing
 * the key set keeps the migration path mechanical — drop a key here only
 * if every consumer is gone. `runUnrestricted` is included because
 * referrer-code-backfill + referrer-welcome operate across tenants.
 */
type PartnerPersistenceKey =
  | '$transaction'
  | 'clinic'
  | 'facilityLead'
  | 'facilityLeadNotification'
  | 'partnerOtpChallenge'
  | 'referral'
  | 'referralPayout'
  | 'referrer'
  | 'referrerMessage'
  | 'referrerPayoutDetails'
  | 'runUnrestricted';

export type PartnerPersistencePort = Pick<
  PrismaDelegatePort,
  PartnerPersistenceKey
>;

export const PARTNER_PERSISTENCE_PORT = 'PartnerPersistencePort';
