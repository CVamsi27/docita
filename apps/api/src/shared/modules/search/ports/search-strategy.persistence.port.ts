import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type SearchStrategyPersistenceKey = 'prescription' | 'patient' | 'appointment';

export type SearchStrategyPersistencePort = Pick<
  PrismaDelegatePort,
  SearchStrategyPersistenceKey
>;

export const SEARCH_STRATEGY_PERSISTENCE_PORT = 'SearchStrategyPersistencePort';
