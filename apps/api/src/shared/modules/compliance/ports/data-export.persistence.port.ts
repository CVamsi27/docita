import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type DataExportPersistenceKey = 'patient' | 'runUnrestricted';

export type DataExportPersistencePort = Pick<
  PrismaDelegatePort,
  DataExportPersistenceKey
>;

export const DATA_EXPORT_PERSISTENCE_PORT = 'DataExportPersistencePort';
