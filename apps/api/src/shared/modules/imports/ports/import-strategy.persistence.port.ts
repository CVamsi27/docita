import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type ImportStrategyPersistenceKey =
  | 'appointment'
  | 'inventoryItem'
  | 'labTest'
  | 'prescription'
  | 'user';

export type ImportStrategyPersistencePort = Pick<
  PrismaDelegatePort,
  ImportStrategyPersistenceKey
>;

export const IMPORT_STRATEGY_PERSISTENCE_PORT =
  'ImportStrategyPersistencePort';
