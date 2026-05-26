import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type SubscriptionPersistenceKey =
  | 'appointment'
  | 'clinic'
  | 'enterpriseContract'
  | 'enterpriseContractMember'
  | 'runUnrestricted'
  | 'staffNotification'
  | 'subscription'
  | 'subscriptionPayment'
  | 'subscriptionReminder'
  | 'usageEvent'
  | 'usageRecord'
  | 'user';

export type SubscriptionPersistencePort = Pick<
  PrismaDelegatePort,
  SubscriptionPersistenceKey
>;

export const SUBSCRIPTION_PERSISTENCE_PORT = 'SubscriptionPersistencePort';
