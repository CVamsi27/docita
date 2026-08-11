import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

/**
 * Prisma surface used by the analytics factories
 * (base-analytics, snapshot-analytics). `getReadClient` is included
 * because base reads use the read replica; `analyticsSnapshot` covers
 * the snapshot write/read path.
 */
type AnalyticsPersistenceKey = 'analyticsSnapshot' | 'getReadClient';

export type AnalyticsPersistencePort = Pick<
  PrismaDelegatePort,
  AnalyticsPersistenceKey
>;

export const ANALYTICS_PERSISTENCE_PORT = 'AnalyticsPersistencePort';
