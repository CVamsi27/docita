import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type BillingPersistenceKey = 'clinic' | 'runUnrestricted' | 'whatsappLog';

export type BillingPersistencePort = Pick<
  PrismaDelegatePort,
  BillingPersistenceKey
>;

export const BILLING_PERSISTENCE_PORT = 'BillingPersistencePort';
