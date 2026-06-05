import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type DocumentPersistenceKey = 'uploadSession' | 'user' | 'document';

export type DocumentPersistencePort = Pick<
  PrismaDelegatePort,
  DocumentPersistenceKey
>;

export const DOCUMENT_PERSISTENCE_PORT = 'DocumentPersistencePort';
