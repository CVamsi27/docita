import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

type WhatsappPersistenceKey =
  | '$transaction'
  | 'appointment'
  | 'clinic'
  | 'clinicSecret'
  | 'invoice'
  | 'prescription';

export type WhatsappPersistencePort = Pick<
  PrismaDelegatePort,
  WhatsappPersistenceKey
>;

export const WHATSAPP_PERSISTENCE_PORT = 'WhatsappPersistencePort';
