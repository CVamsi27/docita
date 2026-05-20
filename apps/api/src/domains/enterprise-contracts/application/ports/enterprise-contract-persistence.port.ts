import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type EnterpriseContractPersistenceKey =
  | 'appointment'
  | 'clinic'
  | 'doctorClinic'
  | 'enterpriseContract'
  | 'enterpriseContractInvoice'
  | 'enterpriseContractMember'
  | 'enterpriseContractRevision'
  | 'enterpriseTrueUpAlert'
  | 'runUnrestricted'
  | 'subscription'
  | 'subscriptionPayment'
  | 'usageEvent'
  | 'usageRecord'
  | 'user';

export type EnterpriseContractPersistencePort = Pick<
  PrismaDelegatePort,
  EnterpriseContractPersistenceKey
>;

export const ENTERPRISE_CONTRACT_PERSISTENCE_PORT =
  'EnterpriseContractPersistencePort';
