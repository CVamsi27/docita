import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type AnonymizationPersistenceKey = 'patient' | 'runUnrestricted';

export type AnonymizationPersistencePort = Pick<
  PrismaDelegatePort,
  AnonymizationPersistenceKey
>;

export const ANONYMIZATION_PERSISTENCE_PORT = 'AnonymizationPersistencePort';
